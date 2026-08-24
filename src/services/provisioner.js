const env = require("../config/env");

class Provisioner {
  get name() {
    throw new Error("Provisioner.name doit être implémenté");
  }

  async provision(customer, channels) {
    throw new Error("Provisioner.provision doit être implémenté");
  }
}

class SimulationProvisioner extends Provisioner {
  get name() {
    return "simulation";
  }

  async provision(customer, channels) {
    await new Promise((r) => setTimeout(r, 600));

    return {
      provider: this.name,
      simulated: true,
      dispatched_at: new Date().toISOString(),
      channel_count: channels.length,
      account_ref: `cust_${customer.id}`
    };
  }
}

class DispatcharrProvisioner extends Provisioner {
  constructor({ baseUrl, apiKey, accountId, timeoutMs }) {
    super();
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.accountId = accountId;
    this.timeoutMs = timeoutMs || 30000;
  }

  get name() {
    return "dispatcharr";
  }

  _headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "X-Account-Id": String(this.accountId)
    };
  }

  async _post(path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: this._headers(),
        body: JSON.stringify(body),
        signal: controller.signal
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (_) {
        data = { raw: text };
      }

      if (!res.ok) {
        const message =
          (data && data.error) || `Dispatcharr a répondu ${res.status}`;
        throw new Error(message);
      }

      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  async provision(customer, channels) {
    const payload = {
      account_id: this.accountId,
      customer_ref: `cust_${customer.id}`,
      channel_external_ids: channels.map((c) => c.external_id)
    };

    const result = await this._post("/api/v1/iptv/playlist/sync", payload);

    return {
      provider: this.name,
      simulated: false,
      dispatched_at: new Date().toISOString(),
      channel_count: channels.length,
      remote_job_id: result.job_id || null
    };
  }
}

function createProvisioner() {
  if (env.dispatcharr.simulation) {
    return new SimulationProvisioner();
  }

  return new DispatcharrProvisioner({
    baseUrl: env.dispatcharr.baseUrl,
    apiKey: env.dispatcharr.apiKey,
    accountId: env.dispatcharr.accountId,
    timeoutMs: env.dispatcharr.timeoutMs
  });
}

module.exports = {
  Provisioner,
  SimulationProvisioner,
  DispatcharrProvisioner,
  createProvisioner
};
