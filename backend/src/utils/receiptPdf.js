const escapePdf = (value) => String(value ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

export const buildReceiptPdf = (lines) => {
    const content = [
        "BT /F1 18 Tf 50 800 Td (CueConnect) Tj ET",
        "BT /F1 11 Tf 50 780 Td (Invoice / Payment Receipt) Tj ET",
        ...lines.map((line, index) => `BT /F1 10 Tf 50 ${750 - index * 16} Td (${escapePdf(line)}) Tj ET`)
    ].join("\n");

    const objects = [
        "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
        "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
        "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
        `4 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`,
        "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj"
    ];

    let offset = 9;
    const xref = ["0000000000 65535 f "];
    let body = "";
    objects.forEach((object) => {
        xref.push(`${String(offset).padStart(10, "0")} 00000 n `);
        body += `${object}\n`;
        offset += Buffer.byteLength(`${object}\n`);
    });

    return Buffer.from(
        `%PDF-1.4\n${body}xref\n0 6\n${xref.join("\n")}\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`,
        "utf8"
    );
};

const wrapLine = (line, width = 92) => {
    const text = String(line ?? "");
    if (text.length <= width) return [text];
    const parts = [];
    for (let index = 0; index < text.length; index += width) {
        parts.push(text.slice(index, index + width));
    }
    return parts;
};

export const buildReportPdf = (title, lines) => {
    const wrapped = lines.flatMap((line) => wrapLine(line));
    const perPage = 46;
    const chunks = [];
    for (let index = 0; index < wrapped.length; index += perPage) {
        chunks.push(wrapped.slice(index, index + perPage));
    }
    if (!chunks.length) chunks.push([""]);

    const pageCount = chunks.length;
    const objects = ["1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj"];
    const pageRefs = chunks.map((_, index) => `${3 + index} 0 R`).join(" ");
    objects.push(`2 0 obj << /Type /Pages /Kids [${pageRefs}] /Count ${pageCount} >> endobj`);

    const fontId = 3 + pageCount * 2;
    chunks.forEach((chunk, index) => {
        const pageId = 3 + index;
        const contentId = 3 + pageCount + index;
        const content = [
            `BT /F1 16 Tf 50 770 Td (${escapePdf("CueConnect")}) Tj ET`,
            `BT /F1 11 Tf 50 752 Td (${escapePdf(title)}) Tj ET`,
            ...chunk.map((line, lineIndex) => `BT /F1 9 Tf 50 ${730 - lineIndex * 14} Td (${escapePdf(line)}) Tj ET`)
        ].join("\n");
        objects.push(`${pageId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >> endobj`);
        objects.push(`${contentId} 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`);
    });
    objects.push(`${fontId} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`);

    let offset = 9;
    const xref = ["0000000000 65535 f "];
    let body = "";
    objects.forEach((object) => {
        xref.push(`${String(offset).padStart(10, "0")} 00000 n `);
        body += `${object}\n`;
        offset += Buffer.byteLength(`${object}\n`);
    });

    return Buffer.from(
        `%PDF-1.4\n${body}xref\n0 ${objects.length + 1}\n${xref.join("\n")}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`,
        "utf8"
    );
};
