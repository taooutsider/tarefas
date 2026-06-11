#!/usr/bin/env node
import process from "node:process";

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? "915f933fbec8fec2e4871db3feb9bc43";
const zoneName = process.env.CLOUDFLARE_ZONE_NAME ?? "taooutsider.com";
const hostname = process.env.OFFICE_HOSTNAME ?? "office.taooutsider.com";
const tunnelId = process.env.OFFICE_TUNNEL_ID ?? "b6eae6b3-e5db-4691-a79d-9006dc5f69d9";
const allowedEmail = process.env.OFFICE_ALLOWED_EMAIL ?? "victorlamenha@vlmkt.com.br";

if (!token) {
  throw new Error(
    [
      "Missing CLOUDFLARE_API_TOKEN.",
      "Required permissions: Zone DNS Edit, Zone Read, Account Access/Zero Trust Apps Edit, Account Read.",
    ].join(" "),
  );
}

const base = "https://api.cloudflare.com/client/v4";

async function cf(path, init = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const errors = payload.errors?.map((error) => `${error.code ?? ""} ${error.message ?? ""}`.trim()).join("; ");
    throw new Error(`${init.method ?? "GET"} ${path} failed: ${response.status} ${errors || response.statusText}`);
  }
  return payload.result;
}

async function main() {
  const zones = await cf(`/zones?name=${encodeURIComponent(zoneName)}`);
  const zoneId = zones[0]?.id;
  if (!zoneId) {
    throw new Error(`Cloudflare zone not found: ${zoneName}`);
  }

  await cf(`/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`, {
    method: "PUT",
    body: JSON.stringify({
      config: {
        ingress: [
          { hostname, service: "http://localhost:4174" },
          { service: "http_status:404" },
        ],
      },
    }),
  });
  console.log(`Tunnel ingress configured: ${hostname} -> http://localhost:4174`);

  const dnsRecords = await cf(`/zones/${zoneId}/dns_records?type=CNAME&name=${encodeURIComponent(hostname)}`);
  const dnsBody = {
    content: `${tunnelId}.cfargotunnel.com`,
    name: hostname,
    proxied: true,
    ttl: 1,
    type: "CNAME",
  };
  if (dnsRecords[0]) {
    await cf(`/zones/${zoneId}/dns_records/${dnsRecords[0].id}`, {
      method: "PUT",
      body: JSON.stringify(dnsBody),
    });
    console.log(`DNS CNAME updated: ${hostname}`);
  } else {
    await cf(`/zones/${zoneId}/dns_records`, {
      method: "POST",
      body: JSON.stringify(dnsBody),
    });
    console.log(`DNS CNAME created: ${hostname}`);
  }

  const apps = await cf(`/accounts/${accountId}/access/apps?domain=${encodeURIComponent(hostname)}`);
  let app = apps.find((item) => item.domain === hostname);
  if (!app) {
    app = await cf(`/accounts/${accountId}/access/apps`, {
      method: "POST",
      body: JSON.stringify({
        auto_redirect_to_identity: false,
        domain: hostname,
        name: "Agent Office",
        session_duration: "24h",
        type: "self_hosted",
      }),
    });
    console.log(`Cloudflare Access app created: ${app.id}`);
  } else {
    console.log(`Cloudflare Access app exists: ${app.id}`);
  }

  const policies = await cf(`/accounts/${accountId}/access/apps/${app.id}/policies`);
  const policyName = "Victor only OTP";
  if (!policies.some((policy) => policy.name === policyName)) {
    await cf(`/accounts/${accountId}/access/apps/${app.id}/policies`, {
      method: "POST",
      body: JSON.stringify({
        decision: "allow",
        include: [{ email: { email: allowedEmail } }],
        name: policyName,
      }),
    });
    console.log(`Cloudflare Access policy created for ${allowedEmail}`);
  } else {
    console.log(`Cloudflare Access policy exists: ${policyName}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
