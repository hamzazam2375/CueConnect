import PDFDocument from "pdfkit";

const NAVY = "#14213d";
const TEXT = "#222222";
const MUTED = "#6b7280";
const RULE = "#d1d5db";
const MARGIN = 50;

// Currency helper: formatRs(0) / formatRs(null) / formatRs(undefined) -> "Rs. 0"
export const formatRs = (value) => {
    const number = Number(value);
    const safe = Number.isFinite(number) ? number : 0;
    return `Rs. ${safe.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
};

const contentWidth = (doc) => doc.page.width - MARGIN * 2;
const pageBottom = (doc) => doc.page.height - doc.page.margins.bottom;

const hLine = (doc, y, color = RULE) => {
    doc.moveTo(MARGIN, y).lineTo(doc.page.width - MARGIN, y).lineWidth(0.5).strokeColor(color).stroke();
};

const ensureSpace = (doc, height) => {
    if (doc.y + height > pageBottom(doc)) doc.addPage();
};

const addHeader = (doc, title) => {
    doc.font("Helvetica-Bold").fontSize(20).fillColor(NAVY).text("CueConnect", MARGIN, doc.y);
    doc.font("Helvetica").fontSize(12).fillColor(NAVY).text(String(title ?? ""));
    doc.moveDown(0.6);
    hLine(doc, doc.y, NAVY);
    doc.moveDown(1);
};

// "Page X of Y" on every page, drawn after all content so Y is known.
const addPageNumbers = (doc) => {
    const { start, count } = doc.bufferedPageRange();
    for (let i = start; i < start + count; i++) {
        doc.switchToPage(i);
        const bottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0; // stops PDFKit adding a page when writing inside the margin
        doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(`Page ${i + 1} of ${count}`, MARGIN, doc.page.height - 35, {
            width: contentWidth(doc),
            align: "right",
            lineBreak: false
        });
        doc.page.margins.bottom = bottomMargin;
    }
};

const createPdf = (build) =>
    new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });
        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
        try {
            build(doc);
            addPageNumbers(doc);
            doc.end();
        } catch (error) {
            reject(error);
        }
    });

const drawHeading = (doc, text) => {
    ensureSpace(doc, 40);
    doc.moveDown(0.6);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(NAVY).text(text, MARGIN, doc.y);
    doc.moveDown(0.3);
    hLine(doc, doc.y);
    doc.moveDown(0.3);
};

// Label on the left, amount/value right-aligned.
const drawKeyValue = (doc, label, value) => {
    const width = contentWidth(doc);
    const valueWidth = width * 0.35;
    const labelWidth = width - valueWidth;
    doc.font("Helvetica").fontSize(10);
    const height =
        Math.max(
            doc.heightOfString(label, { width: labelWidth - 10 }),
            doc.heightOfString(value, { width: valueWidth })
        ) + 10;
    ensureSpace(doc, height);
    const y = doc.y;
    doc.fillColor(TEXT).text(label, MARGIN, y + 5, { width: labelWidth - 10 });
    doc.text(value, MARGIN + labelWidth, y + 5, { width: valueWidth, align: "right" });
    doc.x = MARGIN;
    doc.y = y + height;
    hLine(doc, doc.y);
};

// columns: [{ header, width?, align? }] (columns without width share the remaining space); rows: arrays of cell values.
const drawTable = (doc, columns, rows) => {
    const total = contentWidth(doc);
    const fixed = columns.reduce((sum, column) => sum + (column.width || 0), 0);
    const flexCount = columns.filter((column) => !column.width).length || 1;
    const widths = columns.map((column) => column.width || (total - fixed) / flexCount);
    const headers = columns.map((column) => column.header);

    const heightOf = (cells, bold) => {
        doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
        return Math.max(...cells.map((text, i) => doc.heightOfString(text, { width: widths[i] - 10 })), 9) + 10;
    };

    const drawCells = (cells, bold) => {
        const height = heightOf(cells, bold);
        const y = doc.y;
        let x = MARGIN;
        doc.fillColor(bold ? NAVY : TEXT);
        cells.forEach((text, i) => {
            doc.text(text, x + 5, y + 5, { width: widths[i] - 10, align: columns[i].align || "left" });
            x += widths[i];
        });
        doc.x = MARGIN;
        doc.y = y + height;
        hLine(doc, doc.y, bold ? NAVY : RULE);
    };

    ensureSpace(doc, heightOf(headers, true) + 30);
    drawCells(headers, true);

    if (!rows.length) {
        doc.font("Helvetica").fontSize(9).fillColor(MUTED).text("No records.", MARGIN + 5, doc.y + 6);
        doc.x = MARGIN;
        return;
    }

    rows.forEach((row) => {
        const cells = columns.map((_, i) => String(row[i] ?? ""));
        if (doc.y + heightOf(cells, false) > pageBottom(doc)) {
            doc.addPage();
            drawCells(headers, true); // repeat the header on every page
        }
        drawCells(cells, false);
    });
    doc.moveDown(0.5);
};

// A line can be:
//   "Label: value"  -> aligned row     "Section name:" -> section heading
//   ""              -> small gap       any other text  -> paragraph
//   { table: { columns, rows } }       -> table with repeating header
const renderLines = (doc, lines) => {
    (lines ?? []).forEach((line) => {
        if (line && typeof line === "object") {
            if (line.table) drawTable(doc, line.table.columns, line.table.rows ?? []);
            return;
        }
        const text = String(line ?? "").trim();
        if (!text) {
            doc.moveDown(0.5);
            return;
        }
        const match = text.match(/^(.+?):\s*(.*)$/);
        if (match && match[2]) {
            drawKeyValue(doc, match[1], match[2]);
        } else if (match) {
            drawHeading(doc, match[1]);
        } else {
            ensureSpace(doc, 20);
            doc.font("Helvetica").fontSize(10).fillColor(TEXT).text(text, MARGIN, doc.y, { width: contentWidth(doc) });
            doc.moveDown(0.3);
        }
    });
};

export const buildReceiptPdf = (lines) =>
    createPdf((doc) => {
        addHeader(doc, "Invoice / Payment Receipt");
        renderLines(doc, lines);
    });

export const buildReportPdf = (title, lines) =>
    createPdf((doc) => {
        addHeader(doc, title);
        renderLines(doc, lines);
    });