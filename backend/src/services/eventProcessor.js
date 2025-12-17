class EventProcessor {
  processEvent(rawEvent) {
    const amount = this.extractAmount(rawEvent.entry);
    const status = this.normalizeStatus(rawEvent.entry);
    const isDoor = this.isDoorEvent(rawEvent);
    const isCashBox = this.isCashBoxEvent(rawEvent);
    const isFinancial = this.isFinancialEvent(rawEvent);
    const eventTsRaw = rawEvent.eventtimestamp;
    const eventTs = (typeof eventTsRaw === 'string' && !/[zZ]|[+\-]\d{2}:?\d{2}/.test(eventTsRaw))
      ? new Date(String(eventTsRaw).replace(' ', 'T') + 'Z')
      : new Date(eventTsRaw);
    return {
      row_id: parseInt(rawEvent.row_id, 10),
      device_id: rawEvent.serial, // using serial as device_id key
      imei: rawEvent.imei,
      serial_number: rawEvent.serial,
      event_type: rawEvent.eventtype,
      event_id: rawEvent.eventid,
      event_entry: rawEvent.entry,
      parsed_amount: amount,
      parsed_status: status,
      is_door_event: isDoor,
      is_cash_box_event: isCashBox,
      is_financial_event: isFinancial,
      is_voucher_event: this.isVoucherEvent(rawEvent),
      event_timestamp: eventTs,
      report_timestamp: new Date(rawEvent.reporttime),
      severity: this.determineSeverity(rawEvent)
    };
  }
  extractAmount(entry) {
    if (!entry) return null;
    const s = String(entry);
    // Remove $, commas, whitespace
    const cleaned = s.replace(/[$,\s]/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  normalizeStatus(entry) {
    if (!entry) return null;
    return String(entry)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
  isDoorEvent(ev) {
    const e = (ev.entry || '').toLowerCase();
    return e.includes('door open') || e.includes('door closed') || e.includes('main door') || e.includes('upper door') || e.includes('belly door') || e.includes('cash door');
  }
  isCashBoxEvent(ev) {
    const e = (ev.entry || '').toLowerCase();
    return e.includes('cash box removed') || e.includes('cash box inserted');
  }
  isFinancialEvent(ev) {
    // "Money Added" OR "Voucher Issued" OR entry has a digit
    // We already relaxed extractAmount so we can be broader here
    return ev.eventid === 'Money Added' || ev.eventid === 'Voucher Issued' || (this.extractAmount(ev.entry) !== null && !this.isDoorEvent(ev) && !this.isCashBoxEvent(ev));
  }
  isVoucherEvent(ev) {
    return ev.eventid === 'Voucher Issued';
  }
  determineSeverity(ev) {
    // derive from catalog-friendly values; fallback rules
    if (ev.eventid === 'Money Added' || ev.eventid === 'Voucher Issued') return 'normal';
    const entry = (ev.entry || '').toLowerCase();
    if (entry.includes('door open') || entry.includes('cash box removed')) return 'critical';
    return 'info';
  }
}

module.exports = new EventProcessor();
