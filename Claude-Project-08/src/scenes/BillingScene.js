// BillingScene - Financial nightmare management

import Phaser from 'phaser';
import gameState from '../systems/GameState.js';
import ContentData from '../systems/ContentData.js';

export default class BillingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BillingScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.createBackground();

    // Title
    this.add.text(width / 2, 30, 'HOSPITAL BILLING DEPARTMENT', {
      fontFamily: 'Courier New, monospace',
      fontSize: '26px',
      color: '#1a1a1a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 60, '"Have you considered starting a GoFundMe?"', {
      fontFamily: 'Courier New, monospace',
      fontSize: '13px',
      color: '#666666',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Main panels
    this.createFinancialSummary();
    this.createBillsPanel();
    this.createOptionsPanel();

    // Back button
    this.createBackButton();
  }

  createBackground() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const graphics = this.add.graphics();

    // Harsh fluorescent office lighting
    graphics.fillStyle(0xf5f5dc, 1);
    graphics.fillRect(0, 0, width, height);

    // Scattered paper effect
    graphics.fillStyle(0xffffff, 0.5);
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * width - 50;
      const y = Math.random() * height - 30;
      graphics.fillRect(x, y, 70 + Math.random() * 30, 90 + Math.random() * 40);
    }

    // Grid lines like ruled paper
    graphics.lineStyle(1, 0xadd8e6, 0.15);
    for (let y = 0; y < height; y += 25) {
      graphics.lineBetween(0, y, width, y);
    }
  }

  createFinancialSummary() {
    const panelX = 20;
    const panelY = 90;
    const panelWidth = 300;

    const panel = this.add.graphics();
    panel.fillStyle(0xfefefe, 1);
    panel.fillRect(panelX, panelY, panelWidth, 280);
    panel.lineStyle(2, 0x333333, 1);
    panel.strokeRect(panelX, panelY, panelWidth, 280);

    // Header stripe
    panel.fillStyle(gameState.resources.money < 0 ? 0x8B0000 : 0x8B0000, 1);
    panel.fillRect(panelX, panelY, panelWidth, 35);

    this.add.text(panelX + 15, panelY + 10, 'FINANCIAL SUMMARY', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    });

    const stats = [
      { label: 'Current Savings', value: `$${gameState.resources.money.toLocaleString()}`, color: gameState.resources.money < 0 ? '#8B0000' : '#28a745' },
      { label: 'Total Owed', value: `$${gameState.finances.totalOwed.toLocaleString()}`, color: '#8B0000' },
      { label: 'Bills Outstanding', value: gameState.finances.bills.filter(b => !b.paid).length.toString(), color: '#1a1a1a' },
      { label: 'In Collections', value: gameState.finances.inCollections ? 'YES' : 'No', color: gameState.finances.inCollections ? '#8B0000' : '#28a745' },
      { label: 'Collection Calls', value: gameState.finances.collectionCalls.toString(), color: '#1a1a1a' },
      { label: 'Bankruptcy Filed', value: gameState.finances.bankruptcyFiled ? 'YES' : 'No', color: gameState.finances.bankruptcyFiled ? '#8B0000' : '#1a1a1a' },
      { label: 'GoFundMe Active', value: gameState.finances.gofundmeStarted ? `$${gameState.finances.gofundmeRaised.toLocaleString()} raised` : 'No', color: '#1a1a1a' }
    ];

    let yOffset = 50;
    stats.forEach(stat => {
      this.add.text(panelX + 15, panelY + yOffset, stat.label + ':', {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: '#666666'
      });
      this.add.text(panelX + panelWidth - 15, panelY + yOffset, stat.value, {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: stat.color,
        fontStyle: 'bold'
      }).setOrigin(1, 0);
      yOffset += 30;
    });

    // Net worth calculation
    const netWorth = gameState.resources.money - gameState.finances.totalOwed;
    this.add.text(panelX + 15, panelY + 245, 'Net Worth:', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#1a1a1a',
      fontStyle: 'bold'
    });
    this.add.text(panelX + panelWidth - 15, panelY + 245, `$${netWorth.toLocaleString()}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: netWorth < 0 ? '#8B0000' : '#28a745',
      fontStyle: 'bold'
    }).setOrigin(1, 0);
  }

  createBillsPanel() {
    const panelX = 340;
    const panelY = 90;
    const panelWidth = 400;

    const panel = this.add.graphics();
    panel.fillStyle(0xfefefe, 1);
    panel.fillRect(panelX, panelY, panelWidth, 450);
    panel.lineStyle(2, 0x333333, 1);
    panel.strokeRect(panelX, panelY, panelWidth, 450);

    // Header stripe - red for bills
    panel.fillStyle(0x8B0000, 1);
    panel.fillRect(panelX, panelY, panelWidth, 35);

    this.add.text(panelX + 15, panelY + 10, 'OUTSTANDING BILLS', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    });

    const bills = gameState.finances.bills.filter(b => !b.paid);

    if (bills.length === 0) {
      this.add.text(panelX + 15, panelY + 50, 'No outstanding bills.\n\n(Enjoy it while it lasts.)', {
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        color: '#666666',
        fontStyle: 'italic'
      });
    } else {
      // Scrollable bill list
      let yOffset = 50;
      bills.slice(0, 6).forEach(bill => {
        this.createBillCard(panelX + 10, panelY + yOffset, panelWidth - 20, bill);
        yOffset += 65;
      });

      if (bills.length > 6) {
        this.add.text(panelX + panelWidth / 2, panelY + 430, `+ ${bills.length - 6} more bills...`, {
          fontFamily: 'Courier New, monospace',
          fontSize: '11px',
          color: '#8B0000'
        }).setOrigin(0.5);
      }
    }
  }

  createBillCard(x, y, width, bill) {
    const container = this.add.container(x, y);

    const isOverdue = bill.dueDate < gameState.day;

    const bg = this.add.graphics();
    bg.fillStyle(isOverdue ? 0xfce4e4 : 0xf8f8f8, 1);
    bg.fillRect(0, 0, width, 55);
    bg.lineStyle(1, isOverdue ? 0x8B0000 : 0x333333, 1);
    bg.strokeRect(0, 0, width, 55);

    // Description
    const desc = this.add.text(10, 8, bill.description, {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: '#1a1a1a',
      fontStyle: 'bold'
    });

    // Amount and due date
    const amount = this.add.text(10, 30, `$${bill.amount.toLocaleString()}`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#8B0000',
      fontStyle: 'bold'
    });

    const dueText = isOverdue ? 'OVERDUE' : `Due: Day ${bill.dueDate}`;
    const due = this.add.text(150, 30, dueText, {
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: isOverdue ? '#8B0000' : '#666666'
    });

    // Pay button
    const payBtn = this.add.text(width - 10, 28, 'PAY', {
      fontFamily: 'Courier New, monospace',
      fontSize: '11px',
      color: gameState.resources.money >= bill.amount ? '#28a745' : '#cccccc',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5);

    if (gameState.resources.money >= bill.amount) {
      payBtn.setInteractive({ useHandCursor: true });
      payBtn.on('pointerover', () => payBtn.setColor('#1e7e34'));
      payBtn.on('pointerout', () => payBtn.setColor('#28a745'));
      payBtn.on('pointerdown', () => {
        gameState.payBill(bill.id, bill.amount);
        this.scene.restart();
      });
    }

    container.add([bg, desc, amount, due, payBtn]);
    return container;
  }

  createOptionsPanel() {
    const panelX = 760;
    const panelY = 90;
    const panelWidth = 244;

    const panel = this.add.graphics();
    panel.fillStyle(0xfefefe, 1);
    panel.fillRect(panelX, panelY, panelWidth, 450);
    panel.lineStyle(2, 0x333333, 1);
    panel.strokeRect(panelX, panelY, panelWidth, 450);

    // Header stripe
    panel.fillStyle(0x8B0000, 1);
    panel.fillRect(panelX, panelY, panelWidth, 35);

    this.add.text(panelX + 15, panelY + 10, 'OPTIONS', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    });

    const options = [
      {
        label: 'Start GoFundMe',
        description: 'Beg strangers for money',
        action: () => this.startGoFundMe(),
        enabled: !gameState.finances.gofundmeStarted
      },
      {
        label: 'Apply for Charity Care',
        description: '47-page form, 72-hour deadline',
        action: () => this.applyCharityCare(),
        enabled: true
      },
      {
        label: 'Payment Plan',
        description: 'Spread the pain over years',
        action: () => this.setupPaymentPlan(),
        enabled: gameState.finances.totalOwed > 0
      },
      {
        label: 'Medical Credit Card',
        description: '0% APR* (*then 26.99%)',
        action: () => this.applyMedicalCredit(),
        enabled: true
      },
      {
        label: 'File Bankruptcy',
        description: 'The American Dream™',
        action: () => this.fileBankruptcy(),
        enabled: !gameState.finances.bankruptcyFiled && gameState.finances.totalOwed > 20000
      },
      {
        label: 'Negotiate Bills',
        description: 'Try to reduce charges',
        action: () => this.negotiateBills(),
        enabled: gameState.finances.totalOwed > 0
      }
    ];

    let yOffset = 50;
    options.forEach(opt => {
      this.createOptionButton(panelX + 10, panelY + yOffset, panelWidth - 20, opt);
      yOffset += 65;
    });
  }

  createOptionButton(x, y, width, option) {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(option.enabled ? 0xf8f8f8 : 0xe9ecef, 1);
    bg.fillRect(0, 0, width, 55);
    bg.lineStyle(1, 0x333333, 1);
    bg.strokeRect(0, 0, width, 55);

    const label = this.add.text(10, 10, option.label, {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: option.enabled ? '#1a1a1a' : '#adb5bd',
      fontStyle: 'bold'
    });

    const desc = this.add.text(10, 32, option.description, {
      fontFamily: 'Courier New, monospace',
      fontSize: '9px',
      color: option.enabled ? '#666666' : '#adb5bd'
    });

    container.add([bg, label, desc]);

    if (option.enabled) {
      container.setSize(width, 55);
      container.setInteractive({ useHandCursor: true });

      container.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(0xffffe0, 1);
        bg.fillRect(0, 0, width, 55);
        bg.lineStyle(2, 0x8B0000, 1);
        bg.strokeRect(0, 0, width, 55);
        this.input.setDefaultCursor('pointer');
      });

      container.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(0xf8f8f8, 1);
        bg.fillRect(0, 0, width, 55);
        bg.lineStyle(1, 0x333333, 1);
        bg.strokeRect(0, 0, width, 55);
        this.input.setDefaultCursor('default');
      });

      container.on('pointerdown', option.action);
    }

    return container;
  }

  startGoFundMe() {
    gameState.finances.gofundmeStarted = true;
    gameState.modifyHope(-10, 'Humiliation of begging for money online');

    // Random initial donations
    const raised = Math.floor(Math.random() * 500) + 100;
    gameState.finances.gofundmeRaised = raised;
    gameState.modifyMoney(raised, 'GoFundMe donations');

    this.showResult('GoFundMe Started',
      `Your campaign is live. Strangers have donated $${raised}.\n\nMaybe more will come. Maybe not.`,
      '#f39c12');
  }

  applyCharityCare() {
    // 30% chance of approval
    const approved = Math.random() < 0.3;
    gameState.modifyHope(-15, 'Filling out 47 pages of financial paperwork');
    gameState.advanceDay(3);

    if (approved) {
      const reduction = Math.floor(gameState.finances.totalOwed * 0.5);
      gameState.finances.totalOwed -= reduction;
      this.showResult('Charity Care APPROVED',
        `Your application was approved!\n\nBills reduced by $${reduction.toLocaleString()}.`,
        '#28a745');
    } else {
      this.showResult('Charity Care DENIED',
        'Your application was denied.\n\nReason: "You own a car valued over $500."',
        '#dc3545');
    }
  }

  setupPaymentPlan() {
    gameState.modifyHope(-5, 'Accepting years of debt payments');
    this.showResult('Payment Plan Established',
      `You will pay $${Math.ceil(gameState.finances.totalOwed / 60).toLocaleString()}/month for 5 years.\n\nTotal paid (with interest): $${Math.ceil(gameState.finances.totalOwed * 1.15).toLocaleString()}`,
      '#f39c12');
  }

  applyMedicalCredit() {
    const creditLimit = Math.min(25000, gameState.finances.totalOwed);
    gameState.modifyMoney(creditLimit, 'CareCredit medical credit card');
    gameState.modifyHope(-5, 'Taking on high-interest debt');

    this.showResult('CareCredit Approved!',
      `Credit limit: $${creditLimit.toLocaleString()}\n\n0% APR for 6 months!\n(Then 26.99% APR on FULL balance if not paid)`,
      '#f39c12');
  }

  fileBankruptcy() {
    gameState.finances.bankruptcyFiled = true;
    gameState.finances.totalOwed = 0;
    gameState.finances.bills = [];
    gameState.finances.inCollections = false;
    gameState.modifyHope(-30, 'Filing for medical bankruptcy');
    gameState.resources.money = Math.min(2000, gameState.resources.money); // Can only keep $2000

    this.showResult('Bankruptcy Filed',
      'Your debts are discharged.\n\nYou keep $2,000 maximum.\nCredit ruined for 7 years.\nYou lost your home.\n\nThis is the American healthcare system.',
      '#dc3545');
  }

  negotiateBills() {
    const success = Math.random() < 0.4;
    gameState.advanceDay(1);

    if (success) {
      const reduction = Math.floor(gameState.finances.totalOwed * 0.2);
      gameState.finances.totalOwed -= reduction;
      gameState.modifyHope(5, 'Successfully negotiated bill reduction');
      this.showResult('Negotiation Successful',
        `After 2 hours on hold, you convinced them to reduce your bills by $${reduction.toLocaleString()}.`,
        '#28a745');
    } else {
      gameState.modifyHope(-10, 'Wasted 2 hours on hold for nothing');
      this.showResult('Negotiation Failed',
        '"I\'m sorry, there\'s nothing I can do. These charges are final."\n\nYou were on hold for 2 hours.',
        '#dc3545');
    }
  }

  showResult(title, message, color) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Track all elements for cleanup
    const popupElements = [];

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(100);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    popupElements.push(overlay);

    const panel = this.add.graphics();
    panel.fillStyle(0xfefefe, 1);
    panel.fillRect(width / 2 - 200, height / 2 - 120, 400, 240);
    panel.lineStyle(3, 0x333333, 1);
    panel.strokeRect(width / 2 - 200, height / 2 - 120, 400, 240);
    panel.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
    panel.fillRect(width / 2 - 200, height / 2 - 120, 400, 45);
    panel.setDepth(101);
    popupElements.push(panel);

    const titleText = this.add.text(width / 2, height / 2 - 98, title, {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(102);
    popupElements.push(titleText);

    const msgText = this.add.text(width / 2, height / 2 + 10, message, {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#1a1a1a',
      align: 'center',
      wordWrap: { width: 360 }
    }).setOrigin(0.5).setDepth(102);
    popupElements.push(msgText);

    // Close button
    const closeBtn = this.add.container(width / 2, height / 2 + 85);
    closeBtn.setDepth(102);
    popupElements.push(closeBtn);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x1a1a1a, 1);
    btnBg.fillRect(-50, -18, 100, 36);
    btnBg.lineStyle(2, 0x333333, 1);
    btnBg.strokeRect(-50, -18, 100, 36);

    const btnLabel = this.add.text(0, 0, 'OK', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);

    closeBtn.add([btnBg, btnLabel]);
    closeBtn.setSize(100, 36);
    closeBtn.setInteractive({ useHandCursor: true });

    closeBtn.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x8B0000, 1);
      btnBg.fillRect(-50, -18, 100, 36);
    });

    closeBtn.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x1a1a1a, 1);
      btnBg.fillRect(-50, -18, 100, 36);
      btnBg.lineStyle(2, 0x333333, 1);
      btnBg.strokeRect(-50, -18, 100, 36);
    });

    closeBtn.on('pointerdown', () => {
      popupElements.forEach(el => el.destroy());
      this.scene.restart();
    });
  }

  createBackButton() {
    const backBtn = this.add.container(80, 740);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a1a, 1);
    bg.fillRect(-60, -20, 120, 40);
    bg.lineStyle(2, 0x333333, 1);
    bg.strokeRect(-60, -20, 120, 40);

    const label = this.add.text(0, 0, '← BACK', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5);

    backBtn.add([bg, label]);
    backBtn.setSize(120, 40);
    backBtn.setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x8B0000, 1);
      bg.fillRect(-60, -20, 120, 40);
      this.input.setDefaultCursor('pointer');
    });

    backBtn.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x1a1a1a, 1);
      bg.fillRect(-60, -20, 120, 40);
      bg.lineStyle(2, 0x333333, 1);
      bg.strokeRect(-60, -20, 120, 40);
      this.input.setDefaultCursor('default');
    });

    backBtn.on('pointerdown', () => {
      this.scene.start('GameScene');
    });
  }
}
