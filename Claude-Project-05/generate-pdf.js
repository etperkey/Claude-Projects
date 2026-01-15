const puppeteer = require('puppeteer');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

// Check for compress flag
const compressMode = process.argv.includes('--compress');

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Letter landscape - use lower DPI for compressed version
    const dpi = compressMode ? 100 : 150;
    const pageWidth = Math.round(11 * dpi);
    const pageHeight = Math.round(8.5 * dpi);
    const scaleFactor = compressMode ? 1.5 : 2;

    await page.setViewport({ width: pageWidth, height: pageHeight, deviceScaleFactor: scaleFactor });

    console.log('Loading page...');
    await page.goto('http://127.0.0.1:8080/chicago-dive-bar-calendar-2026.html', {
        waitUntil: 'networkidle0',
        timeout: 90000
    });

    // Wait for content
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 5000));

    // Inject PUNK CSS - MASSIVE photos, good calendar size, blended logos
    await page.addStyleTag({
        content: `
            body { margin: 0 !important; padding: 0 !important; }
            .print-instructions, .photo-credits { display: none !important; }

            /* ========== PUNK COVER - CHICAGO FLAG THEME ========== */
            .cover-page {
                width: ${pageWidth}px !important;
                height: ${pageHeight}px !important;
                min-height: ${pageHeight}px !important;
                max-height: ${pageHeight}px !important;
                padding: 0 !important;
                box-sizing: border-box !important;
                background: #f8f8f8 !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
                align-items: center !important;
                position: relative !important;
                overflow: hidden !important;
            }

            .cover-page::before { display: none !important; }

            /* Chicago flag stripes background */
            .cover-page::after {
                content: '' !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background:
                    linear-gradient(to bottom,
                        #f8f8f8 0%, #f8f8f8 25%,
                        #b3ddf2 25%, #b3ddf2 37.5%,
                        #f8f8f8 37.5%, #f8f8f8 62.5%,
                        #b3ddf2 62.5%, #b3ddf2 75%,
                        #f8f8f8 75%, #f8f8f8 100%
                    ) !important;
                pointer-events: none !important;
            }

            .cover-title-block {
                background:
                    linear-gradient(to bottom,
                        #f8f8f8 0%, #f8f8f8 20%,
                        #b3ddf2 20%, #b3ddf2 40%,
                        #f8f8f8 40%, #f8f8f8 60%,
                        #b3ddf2 60%, #b3ddf2 80%,
                        #f8f8f8 80%, #f8f8f8 100%
                    ) !important;
                padding: 30px 90px !important;
                transform: rotate(-2deg) !important;
                box-shadow: 12px 12px 0 #000, 0 0 0 5px #c41e3a !important;
                position: relative !important;
                z-index: 2 !important;
                border: 5px solid #000 !important;
            }

            /* Red stars decoration on title block */
            .cover-title-block::before {
                content: '★ ★ ★ ★' !important;
                position: absolute !important;
                bottom: -25px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                font-size: 2rem !important;
                color: #c41e3a !important;
                letter-spacing: 0.5em !important;
                text-shadow: 2px 2px 0 #000 !important;
            }

            .cover-page .neon-sign {
                font-size: 6.5rem !important;
                color: #c41e3a !important;
                letter-spacing: 0.12em !important;
                text-shadow: 4px 4px 0 #000 !important;
                -webkit-text-stroke: 2px #000 !important;
            }

            .cover-page .cover-subtitle {
                font-size: 1.8rem !important;
                color: #fff !important;
                letter-spacing: 0.5em !important;
                margin-top: 35px !important;
                background: #c41e3a !important;
                padding: 12px 30px !important;
                display: inline-block !important;
                transform: rotate(1deg) !important;
                position: relative !important;
                z-index: 2 !important;
                border: 3px solid #000 !important;
                box-shadow: 4px 4px 0 #000 !important;
            }

            .cover-page .cover-year {
                font-size: 14rem !important;
                color: #b3ddf2 !important;
                text-shadow: 8px 8px 0 #000, 12px 12px 0 #c41e3a !important;
                margin-top: 15px !important;
                transform: rotate(2deg) !important;
                position: relative !important;
                z-index: 2 !important;
                -webkit-text-stroke: 5px #000 !important;
            }

            .cover-page .beer-icons { display: none !important; }

            .cover-page .cover-tagline {
                font-size: 1rem !important;
                color: #333 !important;
                margin-top: 30px !important;
                max-width: 500px !important;
                position: relative !important;
                z-index: 2 !important;
                border-top: 3px solid #c41e3a !important;
                border-bottom: 3px solid #c41e3a !important;
                padding: 15px 20px !important;
                background: rgba(255,255,255,0.9) !important;
            }

            .cover-page .intro-text { display: none !important; }
            .cover-page .bar-list-preview { display: none !important; }

            /* ========== MONTH PAGES - 50/50 SPLIT ========== */
            .month-page {
                width: ${pageWidth}px !important;
                height: ${pageHeight}px !important;
                min-height: ${pageHeight}px !important;
                max-height: ${pageHeight}px !important;
                display: grid !important;
                grid-template-rows: 50% 50% !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
                background: #1a1a1a !important;
            }

            .month-page::before, .month-page::after { display: none !important; }

            .bar-section {
                display: grid !important;
                grid-template-columns: 68% 32% !important;
                padding: 12px 15px !important;
                gap: 8px !important;
                background: linear-gradient(135deg, #1a1a1a 0%, #252525 100%) !important;
            }

            .photo-container {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 0 !important;
            }

            /* HUGE POLAROID PHOTOS */
            .photo-placeholder {
                width: 100% !important;
                max-width: 800px !important;
                padding: 8px !important;
                padding-bottom: 5px !important;
                background: #f8f8f5 !important;
                transform: rotate(-0.3deg) !important;
                box-shadow: 6px 6px 0 rgba(0,0,0,0.4) !important;
                border: 2px solid #c41e3a !important;
            }

            .photo-placeholder::before {
                padding-bottom: 62% !important;
                filter: contrast(1.1) saturate(1.05) !important;
            }

            .photo-placeholder::after {
                display: none !important;
            }

            .photo-caption {
                margin-top: 6px !important;
                padding: 5px !important;
                background: #f8f8f5 !important;
            }

            .caption-title {
                font-size: 1.1rem !important;
                margin-bottom: 4px !important;
                color: #c41e3a !important;
                text-transform: uppercase !important;
                letter-spacing: 0.1em !important;
            }

            .caption-fact {
                font-size: 0.95rem !important;
                line-height: 1.35 !important;
                color: #444 !important;
            }

            /* COMPACT BAR INFO */
            .bar-info {
                padding: 8px 12px 8px 8px !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
                background: transparent !important;
            }

            .month-name {
                font-size: 2.4rem !important;
                margin-bottom: 3px !important;
                color: #c41e3a !important;
                border-bottom: 4px solid #c41e3a !important;
                padding-bottom: 5px !important;
                letter-spacing: 0.05em !important;
            }

            .bar-name {
                font-size: 2rem !important;
                color: #fff !important;
                text-shadow: 2px 2px 0 #000 !important;
            }

            .bar-address {
                font-size: 1.1rem !important;
                margin-top: 5px !important;
                color: #999 !important;
            }

            .established {
                font-size: 0.95rem !important;
                padding: 3px 10px !important;
                margin-top: 6px !important;
                background: #c41e3a !important;
                color: #fff !important;
                display: inline-block !important;
                align-self: flex-start !important;
            }

            .bar-description {
                font-size: 0.95rem !important;
                line-height: 1.4 !important;
                margin-top: 6px !important;
                padding: 8px !important;
                background: rgba(255,255,255,0.03) !important;
                border-left: 3px solid #c41e3a !important;
                color: #bbb !important;
            }

            .bar-details {
                margin-top: 6px !important;
                gap: 5px !important;
            }

            .detail-item {
                font-size: 0.85rem !important;
                padding: 3px 8px !important;
                background: #333 !important;
                color: #fff !important;
                border: 1px solid #444 !important;
            }

            .detail-item span {
                color: #c41e3a !important;
            }

            .signature {
                font-size: 0.95rem !important;
                margin-top: 6px !important;
                color: #666 !important;
            }

            /* GOOD SIZE CALENDAR GRID */
            .calendar-grid {
                padding: 12px 25px 18px 25px !important;
                display: flex !important;
                align-items: stretch !important;
                background: #f4e9d8 !important;
                position: relative !important;
            }

            .calendar-table {
                width: 100% !important;
                height: 100% !important;
                border: 3px solid #1a1a1a !important;
                box-shadow: 4px 4px 0 rgba(0,0,0,0.25) !important;
            }

            .calendar-table th {
                font-size: 1.4rem !important;
                padding: 10px 6px !important;
                background: #1a1a1a !important;
                color: #fff !important;
                letter-spacing: 0.12em !important;
            }

            .calendar-table td {
                height: auto !important;
                padding: 8px !important;
                vertical-align: top !important;
                background: #fff !important;
                border: 1px solid #ccc !important;
            }

            .calendar-table td.weekend .day-number {
                color: #c41e3a !important;
            }

            .calendar-table td.empty {
                background: #f0ebe0 !important;
            }

            .day-number {
                font-size: 1.6rem !important;
                font-weight: bold !important;
            }
        `
    });

    // Wait for styles to apply
    await new Promise(r => setTimeout(r, 500));

    // Inject blended Chicago logos and flag elements
    await page.evaluate(() => {
        // Chicago Flag SVG - blended colors
        const chicagoFlagSVG = `
            <svg viewBox="0 0 90 60" style="width:100%;height:100%;">
                <rect fill="#f4e9d8" width="90" height="60"/>
                <rect fill="#8BA5B5" y="15" width="90" height="7.5" opacity="0.7"/>
                <rect fill="#8BA5B5" y="37.5" width="90" height="7.5" opacity="0.7"/>
                <g fill="#c41e3a" opacity="0.85">
                    <polygon points="17,30 19.5,23 22,30 15,26.5 25,26.5"/>
                    <polygon points="32,30 34.5,23 37,30 30,26.5 40,26.5"/>
                    <polygon points="53,30 55.5,23 58,30 51,26.5 61,26.5"/>
                    <polygon points="68,30 70.5,23 73,30 66,26.5 76,26.5"/>
                </g>
            </svg>`;

        // Add to cover page - ONLY logos, flag is now in background
        const coverPage = document.querySelector('.cover-page');
        if (coverPage) {
            // Old Style actual logo image
            const oldStyleLogo = document.createElement('img');
            oldStyleLogo.src = 'https://cdn11.bigcommerce.com/s-4np45xy/images/stencil/1280x1280/products/1681/5946/Old_Style_Tin_Tacker__93259.1737517187.jpg?c=2';
            oldStyleLogo.style.cssText = 'position:absolute;top:15px;left:15px;width:130px;height:auto;transform:rotate(-3deg);z-index:10;opacity:0.85;border-radius:50%;box-shadow:4px 4px 8px rgba(0,0,0,0.5);';
            coverPage.appendChild(oldStyleLogo);

            // Malort actual logo image - trimmed more at bottom
            const malortLogo = document.createElement('div');
            malortLogo.style.cssText = 'position:absolute;top:15px;right:15px;width:100px;height:95px;transform:rotate(3deg);z-index:10;opacity:0.85;box-shadow:4px 4px 8px rgba(0,0,0,0.5);overflow:hidden;';
            const malortImg = document.createElement('img');
            malortImg.src = 'https://ih1.redbubble.net/image.4316689394.9437/flat,750x,075,f-pad,750x1000,f8f8f8.jpg';
            malortImg.style.cssText = 'width:100%;height:auto;margin-top:-20%;';
            malortLogo.appendChild(malortImg);
            coverPage.appendChild(malortLogo);
        }

        // Add to each month page - Chicago flag + big logos
        const monthPages = document.querySelectorAll('.month-page');
        monthPages.forEach((page, index) => {
            // Chicago flag on bar section (top portion)
            const barSection = page.querySelector('.bar-section');
            if (barSection) {
                barSection.style.position = 'relative';

                // Chicago flag - bottom left of bar section
                const flagBar = document.createElement('div');
                flagBar.innerHTML = chicagoFlagSVG;
                flagBar.style.cssText = 'position:absolute;bottom:8px;left:8px;width:70px;height:47px;opacity:0.4;z-index:10;';
                barSection.appendChild(flagBar);

                // BIG logos - 300% bigger (40px -> 120px, 32px -> 96px)
                if (index % 2 === 0) {
                    const badge = document.createElement('img');
                    badge.src = 'https://cdn11.bigcommerce.com/s-4np45xy/images/stencil/1280x1280/products/1681/5946/Old_Style_Tin_Tacker__93259.1737517187.jpg?c=2';
                    badge.style.cssText = 'position:absolute;bottom:5px;right:5px;width:120px;height:auto;opacity:0.5;transform:rotate(3deg);border-radius:50%;';
                    barSection.appendChild(badge);
                } else {
                    // Malort logo trimmed more aggressively
                    const malortContainer = document.createElement('div');
                    malortContainer.style.cssText = 'position:absolute;bottom:5px;right:5px;width:96px;height:100px;opacity:0.5;transform:rotate(-2deg);overflow:hidden;';
                    const malortImg = document.createElement('img');
                    malortImg.src = 'https://ih1.redbubble.net/image.4316689394.9437/flat,750x,075,f-pad,750x1000,f8f8f8.jpg';
                    malortImg.style.cssText = 'width:100%;height:auto;margin-top:-20%;';
                    malortContainer.appendChild(malortImg);
                    barSection.appendChild(malortContainer);
                }
            }

            // Chicago flag on calendar section too
            const calendarGrid = page.querySelector('.calendar-grid');
            if (calendarGrid) {
                const flagCal = document.createElement('div');
                flagCal.innerHTML = chicagoFlagSVG;
                flagCal.style.cssText = 'position:absolute;bottom:5px;right:12px;width:50px;height:33px;opacity:0.35;z-index:10;';
                calendarGrid.appendChild(flagCal);
            }

            // ★★★ YUSTYNA'S BIRTHDAY - JUNE 26TH ★★★
            // June is month index 5 (0-indexed)
            if (index === 5) {
                const table = calendarGrid.querySelector('.calendar-table');
                if (table) {
                    const cells = table.querySelectorAll('td');
                    cells.forEach(cell => {
                        const dayNum = cell.querySelector('.day-number');
                        if (dayNum && dayNum.textContent.trim() === '26') {
                            // MEGA BIRTHDAY STYLING
                            cell.style.cssText = `
                                background: linear-gradient(135deg, #ff1493, #ff69b4, #ffb6c1, #ff1493, #ff69b4) !important;
                                animation: rainbow 0.5s infinite !important;
                                position: relative !important;
                                overflow: visible !important;
                                box-shadow: 0 0 20px #ff1493, 0 0 40px #ff69b4, 0 0 60px #ffb6c1, inset 0 0 30px rgba(255,255,255,0.5) !important;
                                border: 4px solid gold !important;
                                transform: scale(1.15) !important;
                                z-index: 100 !important;
                            `;

                            // Change day number to be HUGE and golden
                            dayNum.style.cssText = `
                                font-size: 1.8rem !important;
                                color: gold !important;
                                text-shadow: 2px 2px 0 #c41e3a, -1px -1px 0 #ff1493, 3px 3px 6px rgba(0,0,0,0.5) !important;
                                font-weight: 900 !important;
                            `;

                            // Add YUSTYNA'S BIRTHDAY text
                            const birthdayText = document.createElement('div');
                            birthdayText.innerHTML = '🎂🎉✨<br><b>YUSTYNA\'S</b><br><b>BIRTHDAY!</b><br>🎈🎁🥳';
                            birthdayText.style.cssText = `
                                font-size: 0.7rem !important;
                                color: #8B0000 !important;
                                font-weight: 900 !important;
                                text-transform: uppercase !important;
                                letter-spacing: 0.05em !important;
                                line-height: 1.15 !important;
                                text-shadow: 1px 1px 0 gold !important;
                                margin-top: 3px !important;
                            `;
                            cell.appendChild(birthdayText);

                            // Add party hat on top left corner
                            const partyHat = document.createElement('div');
                            partyHat.innerHTML = '🎊';
                            partyHat.style.cssText = 'position:absolute;top:-15px;left:-10px;font-size:1.8rem;transform:rotate(-20deg);z-index:101;';
                            cell.appendChild(partyHat);

                            // Add balloon on top right
                            const balloon = document.createElement('div');
                            balloon.innerHTML = '🎈';
                            balloon.style.cssText = 'position:absolute;top:-20px;right:-8px;font-size:1.6rem;transform:rotate(15deg);z-index:101;';
                            cell.appendChild(balloon);

                            // Add sparkles around
                            const sparkle1 = document.createElement('div');
                            sparkle1.innerHTML = '✨';
                            sparkle1.style.cssText = 'position:absolute;top:-12px;left:40%;font-size:1.2rem;z-index:101;';
                            cell.appendChild(sparkle1);

                            const sparkle2 = document.createElement('div');
                            sparkle2.innerHTML = '⭐';
                            sparkle2.style.cssText = 'position:absolute;bottom:-10px;left:-5px;font-size:1rem;z-index:101;';
                            cell.appendChild(sparkle2);

                            const sparkle3 = document.createElement('div');
                            sparkle3.innerHTML = '💖';
                            sparkle3.style.cssText = 'position:absolute;bottom:-12px;right:-5px;font-size:1.1rem;z-index:101;';
                            cell.appendChild(sparkle3);

                            // Add crown on the day number
                            const crown = document.createElement('div');
                            crown.innerHTML = '👑';
                            crown.style.cssText = 'position:absolute;top:0px;left:3px;font-size:0.9rem;z-index:102;';
                            cell.appendChild(crown);

                            // Add confetti burst
                            const confetti = document.createElement('div');
                            confetti.innerHTML = '🎉';
                            confetti.style.cssText = 'position:absolute;top:5px;right:3px;font-size:0.8rem;z-index:101;';
                            cell.appendChild(confetti);
                        }
                    });
                }
            }
        });
    });

    // Wait for images to load (including Old Style logo)
    await new Promise(r => setTimeout(r, 3000));

    // Get all pages
    const pageElements = await page.$$('.cover-page, .month-page');
    console.log(`Found ${pageElements.length} pages to capture`);

    // Create PDF document
    const pdfDoc = await PDFDocument.create();

    for (let i = 0; i < pageElements.length; i++) {
        console.log(`Capturing page ${i + 1}/${pageElements.length}...`);

        // Scroll to page
        await pageElements[i].scrollIntoViewIfNeeded();
        await new Promise(r => setTimeout(r, 300));

        // Take screenshot - use JPEG for compressed mode
        const screenshot = await pageElements[i].screenshot({
            type: compressMode ? 'jpeg' : 'png',
            quality: compressMode ? 75 : undefined,
            omitBackground: false
        });

        // Add to PDF (11" x 8.5" at 72 points per inch)
        const image = compressMode
            ? await pdfDoc.embedJpg(screenshot)
            : await pdfDoc.embedPng(screenshot);
        const pdfPage = pdfDoc.addPage([11 * 72, 8.5 * 72]);
        pdfPage.drawImage(image, {
            x: 0,
            y: 0,
            width: 11 * 72,
            height: 8.5 * 72
        });
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const outputFile = compressMode
        ? 'chicago-dive-bar-calendar-2026-compressed.pdf'
        : 'chicago-dive-bar-calendar-2026.pdf';
    fs.writeFileSync(outputFile, pdfBytes);

    await browser.close();
    console.log(`PDF generated with ${pageElements.length} pages!`);
    console.log(`File size: ${(pdfBytes.length / 1024 / 1024).toFixed(2)} MB`);
})();
