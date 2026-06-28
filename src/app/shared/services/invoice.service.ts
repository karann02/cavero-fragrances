import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { environment } from '../../../environments/environment';

type InvoiceItem = {
  name: string;
  size?: string;
  quantity: number;
  price: number;
  total: number;
};

// Brand palette (RGB)
const GREEN: [number, number, number] = [26, 50, 45];     // #1A322D
const TEAL: [number, number, number] = [65, 133, 118];    // #418576
const GOLD: [number, number, number] = [201, 168, 76];    // #C9A84C
const CREAM: [number, number, number] = [255, 247, 228];  // #FFF7E4
const INK: [number, number, number] = [43, 43, 43];
const MUTE: [number, number, number] = [120, 120, 120];
const LINE: [number, number, number] = [228, 228, 224];

const M = 15;            // page margin
const PW = 210;          // A4 width (mm)
const RIGHT = PW - M;    // 195

@Injectable({ providedIn: 'root' })
export class InvoiceService {

  async downloadOrderInvoice(order: any): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logo = await this.getLogo();
    const items = this.getItems(order);

    this.drawHeader(doc, order, logo);
    const metaBottom = this.drawInvoiceMeta(doc, order, 52);
    const partiesBottom = this.drawParties(doc, order, metaBottom + 5);
    const tableBottom = this.drawItemsTable(doc, items, partiesBottom + 4);
    this.drawSummary(doc, order, tableBottom + 6);
    this.drawFooter(doc);

    doc.save(`${this.getInvoiceNumber(order)}.pdf`);
  }

  // ── Header band ────────────────────────────────────────────────────────────
  private drawHeader(doc: jsPDF, order: any, logo: { data: string; w: number; h: number } | null): void {
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, PW, 46, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(0, 46, PW, 1.2, 'F');

    let textX = M;
    if (logo) {
      const chipW = logo.w + 8;
      doc.setFillColor(...CREAM);
      doc.roundedRect(M, 11, chipW, logo.h + 8, 2.5, 2.5, 'F');
      doc.addImage(logo.data, 'PNG', M + 4, 15, logo.w, logo.h);
      textX = M + chipW + 6;
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(19);
    doc.text('Cavero Fragrances', textX, 21);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(159, 227, 197);
    doc.text('CRAFTED ARABIAN LUXURY', textX + 0.5, 27);
    doc.setTextColor(207, 232, 221);
    doc.setFontSize(7);
    doc.text('Surat, Gujarat, India  ·  caverofragrance@gmail.com', textX + 0.5, 32.5);
    doc.text('caverofragrance.com', textX + 0.5, 37);

    // INVOICE title only (Invoice/Order/Date moved to the meta strip below)
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('INVOICE', RIGHT, 27, { align: 'right' });
  }

  // ── Invoice meta strip (Invoice No / Order No / Date) ───────────────────────
  private drawInvoiceMeta(doc: jsPDF, order: any, y: number): number {
    const h = 13;
    doc.setFillColor(250, 246, 236);
    doc.roundedRect(M, y, RIGHT - M, h, 2, 2, 'F');
    const colW = (RIGHT - M) / 3;
    const cells: [string, string][] = [
      ['Invoice No', this.getInvoiceNumber(order)],
      ['Order No', String(order?.order_number || '-')],
      ['Invoice Date', this.formatDate(order?.created_at || order?.createdAt)],
    ];
    cells.forEach(([label, value], i) => {
      const cx = M + 6 + i * colW;
      doc.setTextColor(...MUTE);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(label.toUpperCase(), cx, y + 5);
      doc.setTextColor(...GREEN);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      const v = doc.splitTextToSize(value, colW - 10)[0];
      doc.text(v, cx, y + 10);
    });
    return y + h;
  }

  // ── Bill To / Ship To + meta strip ─────────────────────────────────────────
  private drawParties(doc: jsPDF, order: any, y: number): number {
    const billing = order?.billing_address || order?.shipping_address || {};
    const shipping = order?.shipping_address || order?.billing_address || {};

    const boxW = (RIGHT - M - 6) / 2;
    this.addressCard(doc, 'Bill To', billing, M, y, boxW);
    this.addressCard(doc, 'Ship To', shipping, M + boxW + 6, y, boxW);

    const bottom = y + 34;
    doc.setFillColor(250, 246, 236);
    doc.roundedRect(M, bottom, RIGHT - M, 11, 2, 2, 'F');
    const colW = (RIGHT - M) / 3;
    const cells: [string, string][] = [
      ['Payment Method', this.formatPaymentMethod(order?.payment_method)],
      ['Payment Status', String(order?.payment_status || '-').toUpperCase()],
      ['Items', `${this.getItems(order).length} item(s)`],
    ];
    cells.forEach(([label, value], i) => {
      const cx = M + 5 + i * colW;
      doc.setTextColor(...MUTE);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(label.toUpperCase(), cx, bottom + 4.5);
      doc.setTextColor(...GREEN);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(value, cx, bottom + 8.8);
    });
    return bottom + 11;
  }

  private addressCard(doc: jsPDF, title: string, address: any, x: number, y: number, w: number): void {
    doc.setDrawColor(...LINE);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, w, 30, 2, 2, 'S');
    doc.setFillColor(...TEAL);
    doc.roundedRect(x, y, 26, 7, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(title.toUpperCase(), x + 3.5, y + 4.8);

    const name = [address?.firstName, address?.lastName].map((v) => String(v || '').trim()).filter(Boolean).join(' ');
    doc.setTextColor(...GREEN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(name || 'Customer', x + 4, y + 13);

    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(this.formatAddress(address), w - 8);
    doc.text(lines.slice(0, 4), x + 4, y + 18);
  }

  // ── Items table ─────────────────────────────────────────────────────────────
  private drawItemsTable(doc: jsPDF, items: InvoiceItem[], y: number): number {
    const cols = { idx: M + 4, name: M + 12, qty: 130, rate: 160, amount: RIGHT - 2 };

    doc.setFillColor(...GREEN);
    doc.roundedRect(M, y, RIGHT - M, 9, 1.5, 1.5, 'F');
    doc.setTextColor(255, 244, 236);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('#', cols.idx, y + 6);
    doc.text('PRODUCT', cols.name, y + 6);
    doc.text('QTY', cols.qty, y + 6, { align: 'right' });
    doc.text('RATE', cols.rate, y + 6, { align: 'right' });
    doc.text('AMOUNT', cols.amount, y + 6, { align: 'right' });

    let ry = y + 9;
    doc.setFont('helvetica', 'normal');

    items.forEach((item, i) => {
      const nameLines = doc.splitTextToSize(item.name + (item.size ? `  (${item.size})` : ''), 105);
      const rowH = Math.max(9, nameLines.length * 4.3 + 4.5);

      if (ry + rowH > 250) {
        doc.addPage();
        ry = 20;
      }

      if (i % 2 === 1) {
        doc.setFillColor(250, 251, 250);
        doc.rect(M, ry, RIGHT - M, rowH, 'F');
      }
      doc.setTextColor(...MUTE);
      doc.setFontSize(8);
      doc.text(String(i + 1), cols.idx, ry + 6);
      doc.setTextColor(...INK);
      doc.text(nameLines, cols.name, ry + 6);
      doc.text(String(item.quantity), cols.qty, ry + 6, { align: 'right' });
      doc.text(this.money(item.price), cols.rate, ry + 6, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GREEN);
      doc.text(this.money(item.total), cols.amount, ry + 6, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.2);
      doc.line(M, ry + rowH, RIGHT, ry + rowH);
      ry += rowH;
    });

    return ry;
  }

  // ── Totals + notes + paid stamp ──────────────────────────────────────────────
  private drawSummary(doc: jsPDF, order: any, y: number): void {
    if (y > 232) { doc.addPage(); y = 24; }

    const subtotal = this.num(order?.total_amount);
    const discount = this.num(order?.discount_amount);
    const shipping = this.num(order?.shipping_amount);
    const tax = this.num(order?.tax_amount);
    const grand = this.num(order?.final_amount) || (subtotal - discount + shipping + tax);
    const paid = String(order?.payment_status || '').toLowerCase() === 'paid';

    const barX = 118;            // left edge of the totals block / grand-total bar
    const labelX = barX + 5;     // inner left padding
    const valRight = RIGHT - 5;  // inner right padding (keeps text off the edge)
    const rows: [string, string, boolean][] = [['Subtotal', this.money(subtotal), false]];
    if (discount > 0) rows.push([`Discount${order?.coupon_code ? ' (' + order.coupon_code + ')' : ''}`, '- ' + this.money(discount), true]);
    rows.push(['Shipping', shipping > 0 ? this.money(shipping) : 'FREE', false]);
    if (tax > 0) rows.push(['Tax', this.money(tax), false]);

    let ty = y + 2;
    doc.setFontSize(9);
    rows.forEach(([label, value, isDisc]) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTE);
      doc.text(label, labelX, ty);
      if (isDisc) { doc.setTextColor(31, 157, 87); } else { doc.setTextColor(...INK); }
      doc.text(value, valRight, ty, { align: 'right' });
      ty += 6.5;
    });

    // grand total bar — text padded inside so it never spills out
    doc.setFillColor(...GREEN);
    doc.roundedRect(barX, ty - 1, RIGHT - barX, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('GRAND TOTAL', labelX, ty + 6.5);
    doc.text(this.money(grand), valRight, ty + 6.5, { align: 'right' });

    doc.setTextColor(...TEAL);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('NOTES', M, y + 2);
    doc.setTextColor(...MUTE);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(doc.splitTextToSize('Goods once sold are subject to our return policy. For any discrepancy contact us within 48 hours quoting your invoice number.', 95), M, y + 7);

    if (paid) {
      doc.setDrawColor(31, 157, 87);
      doc.setTextColor(31, 157, 87);
      doc.setLineWidth(1);
      doc.roundedRect(M + 6, y + 24, 40, 13, 2, 2, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('PAID', M + 13, y + 33, { angle: 8 });
    }
  }

  // ── Footer (all pages) ───────────────────────────────────────────────────────
  private drawFooter(doc: jsPDF): void {
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFillColor(...GREEN);
      doc.rect(0, 285, PW, 12, 'F');
      doc.setTextColor(207, 232, 221);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('Thank you for choosing Cavero Fragrances  ·  caverofragrance@gmail.com  ·  caverofragrance.com', M, 291);
      doc.text(`Page ${p} of ${pages}`, RIGHT, 291, { align: 'right' });
    }
  }

  // ── Logo (admin-configured, falls back to bundled) ──────────────────────────
  private async getLogo(): Promise<{ data: string; w: number; h: number } | null> {
    try {
      let url = `${window.location.origin}/assets/images/cavero-logo.png`;
      try {
        const r = await fetch(`${environment.apiGatewayBaseUrl}/api/logo-settings`);
        const j = await r.json();
        const u = j?.data?.logo_url || j?.logo_url;
        if (u) url = /^https?:/i.test(u) ? u : `${environment.apiGatewayBaseUrl}${u.startsWith('/') ? '' : '/'}${u}`;
      } catch { /* keep fallback */ }

      const resp = await fetch(url);
      if (!resp.ok) return null;
      const blob = await resp.blob();
      if (!/png|jpe?g/i.test(blob.type)) return null;
      const data = await new Promise<string>((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result));
        fr.onerror = () => rej();
        fr.readAsDataURL(blob);
      });
      const dims = await new Promise<{ w: number; h: number }>((res, rej) => {
        const img = new Image();
        img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => rej();
        img.src = data;
      });
      const targetH = 13;
      const w = Math.min(46, (dims.w / dims.h) * targetH);
      return { data, w, h: targetH };
    } catch {
      return null;
    }
  }

  // ── Data helpers ────────────────────────────────────────────────────────────
  private getItems(order: any): InvoiceItem[] {
    const raw = Array.isArray(order?.orderItems) ? order.orderItems
      : Array.isArray(order?.order_items) ? order.order_items
        : Array.isArray(order?.OrderItems) ? order.OrderItems : [];

    return raw.map((item: any) => {
      const quantity = Math.max(1, this.num(item?.quantity) || 1);
      const total = this.num(item?.total_price);
      const price = this.num(item?.price) || total / quantity;
      const product = item?.product || item?.Product || {};
      return {
        name: item?.product_name || product?.name || item?.name || `Product #${item?.product_id || ''}`.trim(),
        size: item?.selected_size || '',
        quantity,
        price,
        total: total || price * quantity,
      };
    });
  }

  private formatAddress(address: any): string {
    const parts = [
      address?.address || address?.street || address?.line1,
      [address?.city, address?.state].filter(Boolean).join(', '),
      address?.zip_code ?? address?.zipCode,
      address?.country || 'India',
      address?.phone ? `Phone: ${address.phone}` : '',
    ].map((v) => String(v || '').trim()).filter(Boolean);
    return parts.join('\n') || 'Not available';
  }

  private getInvoiceNumber(order: any): string {
    const raw = String(order?.order_number || order?.id || Date.now()).replace(/[^a-zA-Z0-9-]/g, '');
    return `INV-${raw}`;
  }

  private formatDate(value: any): string {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private formatPaymentMethod(value: any): string {
    const v = String(value || '').trim().toLowerCase();
    if (!v) return '-';
    if (v === 'cod' || v === 'cash_on_delivery') return 'Cash on Delivery';
    if (v === 'online') return 'Online (Razorpay)';
    return v.split(/[_\s-]+/).filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }

  private money(value: number): string {
    return 'Rs. ' + this.num(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private num(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
}
