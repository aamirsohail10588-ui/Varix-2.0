import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export enum ExportFormat {
    CSV = "CSV",
    XLSX = "XLSX",
    PDF = "PDF"
}

export interface ExportOptions {
    title: string;
    headers: string[];
    data: any[][];
    format: ExportFormat;
}

export class ExportService {
    /**
     * Generates an export file buffer or stream based on provided data.
     */
    static async generateExport(options: ExportOptions): Promise<Buffer> {
        const { format, data, headers, title } = options;

        switch (format) {
            case ExportFormat.XLSX:
                return await this.generateExcel(title, headers, data);
            case ExportFormat.CSV:
                return await this.generateCsv(headers, data);
            case ExportFormat.PDF:
                return await this.generatePdf(title, headers, data);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    private static async generateExcel(title: string, headers: string[], data: any[][]): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(title);

        worksheet.addRow(headers);
        data.forEach(row => worksheet.addRow(row));

        // Styling
        worksheet.getRow(1).font = { bold: true };
        worksheet.columns.forEach(column => {
            column.width = 20;
        });

        return await workbook.xlsx.writeBuffer() as any;
    }

    private static async generateCsv(headers: string[], data: any[][]): Promise<Buffer> {
        let csv = headers.join(",") + "\n";
        data.forEach(row => {
            csv += row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(",") + "\n";
        });
        return Buffer.from(csv, "utf-8");
    }

    private static async generatePdf(title: string, headers: string[], data: any[][]): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
            const chunks: any[] = [];

            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", (err) => reject(err));

            // Title
            doc.fontSize(20).text(title, { align: "center" });
            doc.moveDown();

            // Simple Table Implementation
            const tableTop = 100;
            const colWidth = (doc.page.width - 60) / headers.length;

            // Draw Headers
            doc.fontSize(10).font("Helvetica-Bold");
            headers.forEach((h, i) => {
                doc.text(h, 30 + (i * colWidth), tableTop, { width: colWidth, align: "left" });
            });

            doc.moveTo(30, tableTop + 15).lineTo(doc.page.width - 30, tableTop + 15).stroke();

            // Draw Rows
            doc.font("Helvetica").fontSize(8);
            let y = tableTop + 25;
            data.forEach((row, rowIndex) => {
                if (y > doc.page.height - 50) {
                    doc.addPage({ layout: "landscape" });
                    y = 30;
                }
                row.forEach((cell, i) => {
                    doc.text((cell || "").toString().substring(0, 30), 30 + (i * colWidth), y, { width: colWidth, align: "left" });
                });
                y += 15;
            });

            doc.end();
        });
    }
}
