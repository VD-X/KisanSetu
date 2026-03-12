import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface InvoiceData {
    invoiceId: string;
    orderId: string;
    date: string;
    completionDate: string;
    role: 'BUYER' | 'FARMER' | 'TRANSPORTER' | 'ADMIN';

    // Participant Info
    buyer?: {
        name: string;
        email?: string;
        address?: string;
        location?: string;
    };
    farmer?: {
        name: string;
        location?: string;
        farmerId?: string;
    };
    transporter?: {
        name: string;
        vehicleType?: string;
        transporterId?: string;
        licensePlate?: string;
    };

    // Order Info
    items: {
        name: string;
        quantity: number;
        unit: string;
        pricePerUnit: number;
        total: number;
        grade?: string;
    }[];

    // Delivery Info
    delivery?: {
        pickup: string;
        drop: string;
        distance: number;
        cost: number;
        ratePerKm?: number;
    };

    // Financials
    breakdown: {
        itemTotal: number;
        transportCharges?: number;
        platformFee: number;
        taxes: number;
        netAmount?: number; // For farmer/transporter
        finalTotal: number;
    };

    paymentStatus: {
        method: string;
        transactionId?: string;
        status: string;
    };
}

export const invoiceService = {
    generatePDF: async (elementId: string, filename: string) => {
        const source = document.getElementById(elementId);
        if (!source) {
            throw new Error(`Element with id ${elementId} not found`);
        }

        // 1. Create an isolated iframe to prevent main document's CSS (Tailwind/oklch) from interfering
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.left = '-10000px';
        iframe.style.top = '0';
        iframe.width = '794px'; // Locked A4 width at 96 DPI
        iframe.height = '1123px'; // Locked A4 height at 96 DPI
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument;
        if (!doc) throw new Error('Could not create iframe document');

        // 2. Inject static HTML and isolated, safe RGB styles
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <style>
                        /* Minimal safe CSS baseline for PDF generation */
                        * {
                            box-sizing: border-box !important;
                            color: rgb(31, 41, 55) !important; /* Force RGB */
                            border-color: rgb(229, 231, 235) !important;
                            box-shadow: none !important;
                            text-shadow: none !important;
                            filter: none !important;
                            transition: none !important;
                            animation: none !important;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                            background: white !important;
                            font-family: Arial, Helvetica, sans-serif;
                            overflow: hidden; /* Prevent scrollbars from appearing in capture */
                        }
                    </style>
                </head>
                <body>
                    ${source.outerHTML}
                </body>
            </html>
        `);
        doc.close();

        try {
            // 3. CAPTURE: Run html2canvas on the iframe's isolated body
            const canvas = await html2canvas(doc.body, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: 794,        // Lock capture width
                windowWidth: 794,  // Lock viewport width to prevent reflow
                onclone: (clonedDoc) => {
                    // Safety check for SVG class mutations inside the library
                    clonedDoc.querySelectorAll('*').forEach((node) => {
                        const el = node as HTMLElement | SVGElement;
                        if (el instanceof SVGElement) {
                            el.classList.add('pdf-svg-stable');
                        }
                    });
                }
            });

            // 4. PDF GENERATION: Strategic Single-Page Fit
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');

            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 10; // 10mm safety margin to ensure content is "within the border"
            const maxW = pageWidth - (margin * 2);
            const maxH = pageHeight - (margin * 2);

            const canvasW = canvas.width;
            const canvasH = canvas.height;
            const ratio = canvasW / canvasH;

            let finalW = maxW;
            let finalH = finalW / ratio;

            // If height exceeds the printable area, scale down based on height
            if (finalH > maxH) {
                finalH = maxH;
                finalW = finalH * ratio;
            }

            // Center the invoice on the A4 page
            const offsetX = (pageWidth - finalW) / 2;
            const offsetY = (pageHeight - finalH) / 2;

            pdf.addImage(imgData, 'PNG', offsetX, offsetY, finalW, finalH, undefined, 'FAST');
            pdf.save(filename);
        } catch (error) {
            console.error('PDF Generation failed:', error);
            throw error;
        } finally {
            // 5. CLEANUP: Remove the iframe from the main document
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }
    },

    formatInvoiceId: (role: string, orderId: string) => {
        return `INV-${role.substring(0, 1)}-${orderId.substring(0, 8).toUpperCase()}`;
    }
};
