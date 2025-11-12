import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createTestClient, createTestProject, createTestTimeEntry, loginAsTestUser } from './helpers.js';
import { db } from '../db/index.js';
import { invoices, invoiceLineItems, timeEntries } from '../db/schema.js';
import { eq } from 'drizzle-orm';

describe('Invoice Creation with includeNotes Option', () => {
  let app: any;
  let agent: any;
  let clientId: number;
  let projectId: number;

  beforeEach(async () => {
    // Clear invoices to avoid UNIQUE constraint on invoice numbers
    await db.delete(invoices);
    
    // Also clear time entries to ensure clean state
    await db.delete(timeEntries);
    
    app = createApp();
    agent = request.agent(app);
    await loginAsTestUser(agent);

    // Create test client and project
    clientId = await createTestClient(agent);
    projectId = await createTestProject(agent, clientId);
  });

  describe('Project-level invoice creation', () => {
    it('should include notes in line items when includeNotes is true (default)', async () => {
      // Create time entries with notes
      await createTestTimeEntry(agent, projectId, {
        startAt: '2025-10-27T09:00:00.000Z',
        endAt: '2025-10-27T10:00:00.000Z',
        note: 'First task',
      });
      
      await createTestTimeEntry(agent, projectId, {
        startAt: '2025-10-27T11:00:00.000Z',
        endAt: '2025-10-27T12:00:00.000Z',
        note: 'Second task',
      });

      // Create invoice with includeNotes = true (default)
      const response = await agent
        .post(`/api/projects/${projectId}/invoices`)
        .send({
          dateInvoiced: '2025-10-28',
          upToDate: '2025-10-28',
          includeNotes: true,
        });

      expect(response.status).toBe(201);
      
      // Check that line items include notes
      const lineItems = response.body.lineItems;
      
      // Should have 2 separate line items (not grouped by day)
      expect(lineItems).toHaveLength(2);
      
      // Both should include the note
      const firstItem = lineItems.find((item: any) => item.description.includes('First task'));
      const secondItem = lineItems.find((item: any) => item.description.includes('Second task'));
      
      expect(firstItem).toBeDefined();
      expect(secondItem).toBeDefined();
    });

    it('should not include notes in line items when includeNotes is false', async () => {
      // Create time entries with notes
      await createTestTimeEntry(agent, projectId, {
        startAt: '2025-10-27T09:00:00.000Z',
        endAt: '2025-10-27T10:00:00.000Z',
        note: 'First task',
      });
      
      await createTestTimeEntry(agent, projectId, {
        startAt: '2025-10-27T11:00:00.000Z',
        endAt: '2025-10-27T12:00:00.000Z',
        note: 'Second task',
      });

      // Create invoice with includeNotes = false
      const response = await agent
        .post(`/api/projects/${projectId}/invoices`)
        .send({
          dateInvoiced: '2025-10-28',
          upToDate: '2025-10-28',
          includeNotes: false,
        });

      expect(response.status).toBe(201);
      
      // Check that line items do NOT include notes
      const lineItems = response.body.lineItems;
      
      // Should have 2 separate line items
      expect(lineItems).toHaveLength(2);
      
      // Neither should include the notes
      const firstItem = lineItems[0];
      const secondItem = lineItems[1];
      
      expect(firstItem.description).not.toContain('First task');
      expect(firstItem.description).not.toContain('Second task');
      expect(secondItem.description).not.toContain('First task');
      expect(secondItem.description).not.toContain('Second task');
    });

    it('should deduplicate notes when groupByDay is true and includeNotes is true', async () => {
      // Create time entries with duplicate notes
      await createTestTimeEntry(agent, projectId, {
        startAt: '2025-10-27T09:00:00.000Z',
        endAt: '2025-10-27T10:00:00.000Z',
        note: 'Meeting',
      });
      
      await createTestTimeEntry(agent, projectId, {
        startAt: '2025-10-27T11:00:00.000Z',
        endAt: '2025-10-27T12:00:00.000Z',
        note: 'meeting', // Same note, different case
      });

      // Create invoice with groupByDay and includeNotes
      const response = await agent
        .post(`/api/projects/${projectId}/invoices`)
        .send({
          dateInvoiced: '2025-10-28',
          upToDate: '2025-10-28',
          groupByDay: true,
          includeNotes: true,
        });

      expect(response.status).toBe(201);
      
      // Check that notes are deduplicated (case-insensitive)
      const lineItems = response.body.lineItems.filter((item: any) => item.type === 'time');
      
      // Each line item should have notes deduplicated
      for (const lineItem of lineItems) {
        // Count how many times "meeting" appears (case-insensitive)
        const meetingMatches = lineItem.description.match(/meeting/gi);
        // Should appear at most once per line item (deduplicated)
        if (meetingMatches) {
          expect(meetingMatches.length).toBeLessThanOrEqual(1);
        }
      }
    });

    it('should skip empty notes when aggregating', async () => {
      // Create time entries with some having notes and some without
      await createTestTimeEntry(agent, projectId, {
        startAt: '2025-10-27T09:00:00.000Z',
        endAt: '2025-10-27T10:00:00.000Z',
        note: 'With note',
      });
      
      await createTestTimeEntry(agent, projectId, {
        startAt: '2025-10-27T11:00:00.000Z',
        endAt: '2025-10-27T12:00:00.000Z',
        // No note
      });

      // Create invoice with groupByDay and includeNotes
      const response = await agent
        .post(`/api/projects/${projectId}/invoices`)
        .send({
          dateInvoiced: '2025-10-28',
          upToDate: '2025-10-28',
          groupByDay: true,
          includeNotes: true,
        });

      expect(response.status).toBe(201);
      
      // Check that line items include only the note that exists
      const lineItems = response.body.lineItems.filter((item: any) => item.type === 'time');
      
      // At least one line item should contain the note
      const hasNote = lineItems.some((item: any) => item.description.includes('With note'));
      expect(hasNote).toBe(true);
    });
  });

  describe('Client-level invoice creation', () => {
    let project2Id: number;

    beforeEach(async () => {
      // Create a second project for multi-project invoices
      project2Id = await createTestProject(agent, clientId, { name: 'Project 2' });
    });

    it('should include notes in multi-project invoice when includeNotes is true', async () => {
      // Add time entries to project 1
      await createTestTimeEntry(agent, projectId, {
        startAt: '2025-10-27T09:00:00.000Z',
        endAt: '2025-10-27T10:00:00.000Z',
        note: 'Project 1 task',
      });
      
      // Add time entries to project 2
      await createTestTimeEntry(agent, project2Id, {
        startAt: '2025-10-27T09:00:00.000Z',
        endAt: '2025-10-27T10:00:00.000Z',
        note: 'Project 2 task',
      });

      // Create client-level invoice with includeNotes = true
      const response = await agent
        .post(`/api/clients/${clientId}/invoices`)
        .send({
          dateInvoiced: '2025-10-28',
          upToDate: '2025-10-28',
          projectIds: [projectId, project2Id],
          includeNotes: true,
        });

      expect(response.status).toBe(201);
      
      // Check that line items include notes from both projects
      const lineItems = response.body.lineItems;
      
      // Should have 2 line items (one per project)
      expect(lineItems).toHaveLength(2);
      
      // Check that each project's note is included
      const hasProject1Note = lineItems.some((item: any) => 
        item.description.includes('Project 1 task')
      );
      const hasProject2Note = lineItems.some((item: any) => 
        item.description.includes('Project 2 task')
      );
      
      expect(hasProject1Note).toBe(true);
      expect(hasProject2Note).toBe(true);
    });

    it('should not include notes in multi-project invoice when includeNotes is false', async () => {
      // Add time entries to project 1
      await createTestTimeEntry(agent, projectId, {
        startAt: '2025-10-27T09:00:00.000Z',
        endAt: '2025-10-27T10:00:00.000Z',
        note: 'Project 1 task',
      });
      
      // Add time entries to project 2
      await createTestTimeEntry(agent, project2Id, {
        startAt: '2025-10-27T09:00:00.000Z',
        endAt: '2025-10-27T10:00:00.000Z',
        note: 'Project 2 task',
      });

      // Create client-level invoice with includeNotes = false
      const response = await agent
        .post(`/api/clients/${clientId}/invoices`)
        .send({
          dateInvoiced: '2025-10-28',
          upToDate: '2025-10-28',
          projectIds: [projectId, project2Id],
          includeNotes: false,
        });

      expect(response.status).toBe(201);
      
      // Check that line items do NOT include notes
      const lineItems = response.body.lineItems;
      
      // Should have 2 line items (one per project)
      expect(lineItems).toHaveLength(2);
      
      // Neither should include the notes
      const hasProject1Note = lineItems.some((item: any) => 
        item.description.includes('Project 1 task')
      );
      const hasProject2Note = lineItems.some((item: any) => 
        item.description.includes('Project 2 task')
      );
      
      expect(hasProject1Note).toBe(false);
      expect(hasProject2Note).toBe(false);
    });
  });
});
