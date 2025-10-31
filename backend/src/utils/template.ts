import { DateTime } from 'luxon';

const TIMEZONE = process.env.TZ || 'Pacific/Auckland';

/**
 * Interface defining the variables available for template replacement
 */
export interface TemplateVariables {
  DATE?: string;
  INVOICE_DATE?: string;
  INVOICE_NO?: string;
  CLIENT_NAME?: string;
  TOTAL_AMOUNT?: string;
  PERIOD?: string;
  COMPANY_NAME?: string;
  COMPANY_ADDRESS?: string;
}

/**
 * Format a date string to DD MMM YYYY format (e.g., "15 Jan 2025")
 */
function formatDate(dateString: string): string {
  const dt = DateTime.fromISO(dateString, { zone: TIMEZONE });
  return dt.toFormat('dd MMM yyyy');
}

/**
 * Replace template variables in text with their actual values
 * Variables are in the format {VARIABLE_NAME}
 * This replacement happens before markdown rendering so users can wrap
 * variables with markdown formatting like **{INVOICE_NO}**
 * 
 * @param text - The template text containing variables
 * @param variables - Object containing variable values to replace
 * @returns Text with variables replaced by their values
 */
export function replaceTemplateVariables(
  text: string,
  variables: TemplateVariables = {}
): string {
  if (!text) {
    return text;
  }

  let result = text;

  // Replace each variable if it exists in the template
  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Use a global regex to replace all occurrences
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, value);
    }
  });

  return result;
}

/**
 * Build template variables object for invoice context
 * 
 * @param options - Invoice-specific data to include in variables
 * @returns Complete set of template variables
 */
export function buildInvoiceTemplateVariables(options: {
  invoiceNumber?: string;
  invoiceDate?: string;
  clientName?: string;
  totalAmount?: number;
  periodStart?: string;
  periodEnd?: string;
  companyName?: string;
  companyAddress?: string;
}): TemplateVariables {
  const currentDate = DateTime.now().setZone(TIMEZONE).toFormat('dd MMM yyyy');
  
  const variables: TemplateVariables = {
    DATE: currentDate,
  };

  if (options.invoiceDate) {
    variables.INVOICE_DATE = formatDate(options.invoiceDate);
  }

  if (options.invoiceNumber) {
    variables.INVOICE_NO = options.invoiceNumber;
  }

  if (options.clientName) {
    variables.CLIENT_NAME = options.clientName;
  }

  if (options.totalAmount !== undefined) {
    variables.TOTAL_AMOUNT = `NZD ${options.totalAmount.toFixed(2)}`;
  }

  if (options.periodStart && options.periodEnd) {
    const start = formatDate(options.periodStart);
    const end = formatDate(options.periodEnd);
    variables.PERIOD = `${start} - ${end}`;
  }

  if (options.companyName) {
    variables.COMPANY_NAME = options.companyName;
  }

  if (options.companyAddress) {
    variables.COMPANY_ADDRESS = options.companyAddress;
  }

  return variables;
}
