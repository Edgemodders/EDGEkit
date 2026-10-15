// Looks extensions up on the two registries EDGE extensions publish to. Read-only.

// The latest version of an extension (publisher.name) on the Microsoft Marketplace, or null.
export async function marketplace(id) {
  const res = await fetch('https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json;api-version=7.2-preview.1' },
    body: JSON.stringify({
      // filterType 7: extension name (publisher.name); 8: the VS Code target. flags 0x201: latest version only.
      filters: [{ criteria: [{ filterType: 7, value: id }, { filterType: 8, value: 'Microsoft.VisualStudio.Code' }] }],
      flags: 0x201,
    }),
  });
  if (!res.ok) throw new Error(`Marketplace: HTTP ${res.status} for ${id}`);
  const found = (await res.json()).results?.[0]?.extensions?.[0];
  return found?.versions?.[0]?.version ?? null;
}

// The latest version of an extension (publisher.name) on Open VSX, or null.
export async function openVsx(id) {
  const [namespace, name] = id.split('.');
  const res = await fetch(`https://open-vsx.org/api/${namespace}/${name}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open VSX: HTTP ${res.status} for ${id}`);
  return (await res.json()).version ?? null;
}

export const REGISTRIES = { marketplace, openvsx: openVsx };
