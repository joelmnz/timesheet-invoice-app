#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_dir="$(cd "${script_dir}/.." && pwd)"
repo_root="$(cd "${skill_dir}/../../.." && pwd)"

run_outdated() {
  local package_dir="$1"
  local target_dir="${repo_root}/${package_dir}"
  local output
  local status

  echo "## ${package_dir}"

  if [[ ! -d "${target_dir}" ]]; then
    echo "Directory not found: ${target_dir}"
    echo
    return
  fi

  if [[ ! -f "${target_dir}/package.json" ]]; then
    echo "No package.json found in: ${target_dir}"
    echo
    return
  fi

  set +e
  output="$(cd "${target_dir}" && bun outdated 2>&1)"
  status=$?
  set -e

  if [[ -n "${output}" ]]; then
    printf '%s\n' "${output}"
  fi

  if [[ ${status} -ne 0 ]]; then
    echo
    echo "[collect_outdated] bun outdated exited with status ${status} in ${package_dir}"
  fi

  echo
}

run_outdated "backend"
run_outdated "frontend"
