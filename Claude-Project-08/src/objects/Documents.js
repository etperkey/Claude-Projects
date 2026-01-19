// Documents.js - Bills, forms, denial letters

import gameState from '../systems/GameState.js';
import ContentData from '../systems/ContentData.js';

export class DenialLetter {
  constructor(scene, x, y, denial) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.denial = denial;

    this.container = this.create();
  }

  create() {
    const container = this.scene.add.container(this.x, this.y);

    // Paper background
    const paper = this.scene.add.graphics();
    paper.fillStyle(0xffffff, 1);
    paper.fillRect(0, 0, 280, 380);
    paper.lineStyle(2, 0x333333, 1);
    paper.strokeRect(0, 0, 280, 380);

    // Red header
    const header = this.scene.add.graphics();
    header.fillStyle(0xdc3545, 1);
    header.fillRect(0, 0, 280, 50);

    // Provider logo/name
    const providerName = this.scene.add.text(140, 25, gameState.insurance.provider, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // DENIED stamp
    const stamp = this.scene.add.text(200, 100, 'DENIED', {
      fontSize: '36px',
      color: '#dc3545',
      fontStyle: 'bold'
    }).setOrigin(0.5).setRotation(-0.3).setAlpha(0.8);

    // Content
    const content = [
      `Date: Day ${gameState.day}`,
      `Member ID: ****${Math.floor(Math.random() * 9000) + 1000}`,
      '',
      'Dear Valued Customer,',
      '',
      `Your claim for:`,
      `${this.denial.treatment}`,
      '',
      'has been DENIED.',
      '',
      'REASON:',
      this.denial.denialReason,
      '',
      'You may appeal within 72 hours.',
      '',
      'Thank you for choosing',
      `${gameState.insurance.provider}!`
    ].join('\n');

    const text = this.scene.add.text(15, 60, content, {
      fontSize: '11px',
      color: '#333333',
      wordWrap: { width: 250 },
      lineSpacing: 3
    });

    // Fine print
    const finePrint = this.scene.add.text(140, 360, '73% of appeals are also denied.', {
      fontSize: '8px',
      color: '#888888'
    }).setOrigin(0.5);

    container.add([paper, header, providerName, text, stamp, finePrint]);

    // Make interactive
    container.setSize(280, 380);
    container.setInteractive();

    // Drag functionality
    this.scene.input.setDraggable(container);

    container.on('drag', (pointer, dragX, dragY) => {
      container.x = dragX;
      container.y = dragY;
    });

    return container;
  }

  destroy() {
    this.container.destroy();
  }
}

export class HospitalBill {
  constructor(scene, x, y, bill) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.bill = bill;

    this.container = this.create();
  }

  create() {
    const container = this.scene.add.container(this.x, this.y);

    // Paper
    const paper = this.scene.add.graphics();
    paper.fillStyle(0xffffff, 1);
    paper.fillRect(0, 0, 300, 420);
    paper.lineStyle(1, 0xcccccc, 1);
    paper.strokeRect(0, 0, 300, 420);

    // Header
    const header = this.scene.add.text(150, 20, 'MEMORIAL GENERAL HOSPITAL', {
      fontSize: '14px',
      color: '#2d3436',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const subheader = this.scene.add.text(150, 38, 'STATEMENT OF PATIENT CHARGES', {
      fontSize: '10px',
      color: '#636e72'
    }).setOrigin(0.5);

    // Line items
    let yOffset = 70;

    // Generate random line items for realism
    const items = this.generateLineItems();
    let subtotal = 0;

    items.forEach(item => {
      this.scene.add.text(15, yOffset, item.name, {
        fontSize: '10px',
        color: '#2d3436'
      });
      this.scene.add.text(285, yOffset, `$${item.cost.toLocaleString()}`, {
        fontSize: '10px',
        color: '#2d3436'
      }).setOrigin(1, 0);
      subtotal += item.cost;
      yOffset += 18;
    });

    // Subtotal line
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, 0xcccccc, 1);
    divider.lineBetween(15, yOffset + 5, 285, yOffset + 5);

    // Totals
    yOffset += 20;
    this.scene.add.text(15, yOffset, 'SUBTOTAL:', {
      fontSize: '11px',
      color: '#2d3436',
      fontStyle: 'bold'
    });
    this.scene.add.text(285, yOffset, `$${subtotal.toLocaleString()}`, {
      fontSize: '11px',
      color: '#2d3436'
    }).setOrigin(1, 0);

    yOffset += 20;
    this.scene.add.text(15, yOffset, 'Insurance Adjustment:', {
      fontSize: '10px',
      color: '#28a745'
    });
    const adjustment = Math.floor(subtotal * 0.3);
    this.scene.add.text(285, yOffset, `-$${adjustment.toLocaleString()}`, {
      fontSize: '10px',
      color: '#28a745'
    }).setOrigin(1, 0);

    yOffset += 20;
    const patientResp = subtotal - adjustment;
    this.scene.add.text(15, yOffset, 'YOUR RESPONSIBILITY:', {
      fontSize: '14px',
      color: '#dc3545',
      fontStyle: 'bold'
    });
    this.scene.add.text(285, yOffset, `$${patientResp.toLocaleString()}`, {
      fontSize: '14px',
      color: '#dc3545',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    // Due date
    yOffset += 35;
    this.scene.add.text(150, yOffset, `DUE BY: Day ${this.bill.dueDate}`, {
      fontSize: '12px',
      color: this.bill.dueDate < gameState.day ? '#dc3545' : '#2d3436'
    }).setOrigin(0.5);

    // Payment options
    yOffset += 25;
    this.scene.add.text(150, yOffset, 'Payment options available. Call 1-800-PAY-BILLS', {
      fontSize: '9px',
      color: '#888888'
    }).setOrigin(0.5);

    // Past due warning if applicable
    if (this.bill.dueDate < gameState.day) {
      const warning = this.scene.add.text(150, 400, '⚠️ PAST DUE - SENT TO COLLECTIONS', {
        fontSize: '11px',
        color: '#dc3545',
        fontStyle: 'bold'
      }).setOrigin(0.5);
    }

    container.add([paper, header, subheader, divider]);

    return container;
  }

  generateLineItems() {
    const items = [];

    // Always include some standard items
    items.push({ name: 'Room charge (per day)', cost: Math.floor(Math.random() * 3000) + 3000 });
    items.push({ name: 'Physician services', cost: Math.floor(Math.random() * 7000) + 8000 });
    items.push({ name: 'Laboratory', cost: Math.floor(Math.random() * 5000) + 3000 });
    items.push({ name: 'Pharmacy', cost: Math.floor(Math.random() * 10000) + 2000 });
    items.push({ name: 'Facility fee', cost: Math.floor(Math.random() * 2000) + 2000 });

    // Add some absurd items
    const absurdItems = ContentData.absurdBillItems;
    const numAbsurd = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numAbsurd; i++) {
      const item = absurdItems[Math.floor(Math.random() * absurdItems.length)];
      items.push({ name: item.name, cost: item.cost });
    }

    return items;
  }

  destroy() {
    this.container.destroy();
  }
}

export class InsuranceForm {
  constructor(scene, x, y, formType = 'prior_auth') {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.formType = formType;

    this.container = this.create();
  }

  create() {
    const container = this.scene.add.container(this.x, this.y);

    // Paper
    const paper = this.scene.add.graphics();
    paper.fillStyle(0xffffff, 1);
    paper.fillRect(0, 0, 260, 340);
    paper.lineStyle(1, 0x333333, 1);
    paper.strokeRect(0, 0, 260, 340);

    // Header
    const header = this.scene.add.graphics();
    header.fillStyle(0x3498db, 1);
    header.fillRect(0, 0, 260, 40);

    const title = this.scene.add.text(130, 20, this.getFormTitle(), {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Form fields (fake)
    const fields = this.getFormFields();
    let yOffset = 55;

    fields.forEach(field => {
      // Label
      this.scene.add.text(15, yOffset, field.label, {
        fontSize: '9px',
        color: '#636e72'
      });

      // Input box
      const input = this.scene.add.graphics();
      input.fillStyle(0xf8f9fa, 1);
      input.fillRect(15, yOffset + 12, field.width || 230, 20);
      input.lineStyle(1, 0xcccccc, 1);
      input.strokeRect(15, yOffset + 12, field.width || 230, 20);

      yOffset += 40;
    });

    // Fine print
    const finePrint = this.scene.add.text(130, 310, 'Form 47-B Rev. 2024 | Page 1 of 47', {
      fontSize: '8px',
      color: '#888888'
    }).setOrigin(0.5);

    const warning = this.scene.add.text(130, 325, 'Must be submitted within 72 hours', {
      fontSize: '8px',
      color: '#dc3545'
    }).setOrigin(0.5);

    container.add([paper, header, title, finePrint, warning]);

    return container;
  }

  getFormTitle() {
    const titles = {
      prior_auth: 'PRIOR AUTHORIZATION REQUEST',
      appeal: 'CLAIM APPEAL FORM',
      charity: 'FINANCIAL ASSISTANCE APPLICATION',
      complaint: 'MEMBER GRIEVANCE FORM'
    };
    return titles[this.formType] || 'INSURANCE FORM';
  }

  getFormFields() {
    return [
      { label: 'Member Name' },
      { label: 'Member ID' },
      { label: 'Date of Service' },
      { label: 'Diagnosis Code (ICD-10)' },
      { label: 'Procedure Code (CPT)' },
      { label: 'Physician NPI' }
    ];
  }

  destroy() {
    this.container.destroy();
  }
}

// Factory function
export function createDocument(scene, type, x, y, data = {}) {
  switch (type) {
    case 'denial':
      return new DenialLetter(scene, x, y, data);
    case 'bill':
      return new HospitalBill(scene, x, y, data);
    case 'form':
      return new InsuranceForm(scene, x, y, data.formType);
    default:
      console.warn(`Unknown document type: ${type}`);
      return null;
  }
}
