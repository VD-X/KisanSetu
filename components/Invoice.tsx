import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { InvoiceData } from '../services/invoiceService';

interface InvoiceProps {
    data: InvoiceData;
    id?: string;
}

const Invoice: React.FC<InvoiceProps> = ({ data, id = "invoice-container" }) => {
    const isBuyer = data.role === 'BUYER';
    const isFarmer = data.role === 'FARMER';
    const isTransporter = data.role === 'TRANSPORTER';
    const isAdmin = data.role === 'ADMIN';

    // Use HEX colors for reliable PDF generation
    const roleColorHex = isBuyer ? '#2563eb' : isFarmer ? '#16a34a' : isTransporter ? '#d97706' : '#111827';
    const roleBgHex = isBuyer ? '#eff6ff' : isFarmer ? '#f0fdf4' : isTransporter ? '#fffbeb' : '#f3f4f6';

    // Frozen Style Constants (Using PX only, no REM/EM/%)
    const STYLES = {
        container: {
            width: '794px', // A4 Width at 96 DPI
            minHeight: '1123px', // A4 Height at 96 DPI
            padding: '48px',
            backgroundColor: '#ffffff',
            color: '#1f2937',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '14px',
            lineHeight: '1.5',
            margin: '0 auto',
            boxSizing: 'border-box' as const,
            border: '1px solid #e5e7eb', // Explicit border for visual definition in PDF
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '4px solid #111827',
            paddingBottom: '32px',
            marginBottom: '40px',
        },
        title: {
            fontSize: '36px',
            fontWeight: '900',
            color: '#111827',
            margin: '0 0 8px 0',
            fontStyle: 'italic',
        },
        subtitle: {
            fontSize: '12px',
            fontWeight: '700',
            color: '#9ca3af',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            margin: '0',
        },
        label: {
            fontSize: '10px',
            fontWeight: '900',
            color: '#9ca3af',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            margin: '0 0 4px 0',
        },
        value: {
            fontSize: '14px',
            fontWeight: '700',
            color: '#111827',
            margin: '0',
        },
        roleBadge: {
            display: 'inline-block',
            padding: '8px 16px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '900',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            marginBottom: '24px',
            backgroundColor: roleBgHex,
            color: roleColorHex,
        },
        grid: {
            display: 'flex',
            gap: '48px',
            marginBottom: '48px',
        },
        column: {
            flex: 1,
        },
        sectionTitle: {
            fontSize: '11px',
            fontWeight: '900',
            color: '#9ca3af',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            marginBottom: '16px',
            borderBottom: '1px solid #f3f4f6',
            paddingBottom: '8px',
        },
        addressTitle: {
            fontSize: '20px',
            fontWeight: '900',
            color: '#111827',
            margin: '0 0 4px 0',
        },
        addressText: {
            fontSize: '14px',
            color: '#4b5563',
            margin: '8px 0 0 0',
            lineHeight: '1.6',
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse' as const,
            marginBottom: '40px',
        },
        th: {
            backgroundColor: '#111827',
            color: '#ffffff',
            padding: '16px',
            fontSize: '10px',
            fontWeight: '900',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            textAlign: 'left' as const,
        },
        td: {
            padding: '24px 16px',
            borderBottom: '1px solid #f3f4f6',
            verticalAlign: 'top' as const,
        },
        itemName: {
            fontSize: '16px',
            fontWeight: '900',
            color: '#111827',
            margin: '0 0 6px 0',
        },
        grade: {
            display: 'inline-block',
            padding: '2px 8px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: '900',
            color: '#6b7280',
            textTransform: 'uppercase' as const,
        },
        summary: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingTop: '32px',
            borderTop: '2px solid #f3f4f6',
            marginBottom: '48px',
        },
        summaryCard: {
            backgroundColor: '#f9fafb',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid #f3f4f6',
            width: '350px',
        },
        totalSection: {
            width: '280px',
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '16px',
        },
        totalRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '14px',
            fontWeight: '700',
            color: '#6b7280',
        },
        finalTotal: {
            paddingTop: '16px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '8px',
        },
        finalLabel: {
            fontSize: '12px',
            fontWeight: '900',
            color: '#111827',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.2em',
        },
        finalValue: {
            fontSize: '24px',
            fontWeight: '900',
            color: roleColorHex,
            letterSpacing: '-0.02em',
        },
        footer: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            borderTop: '1px solid #f3f4f6',
            paddingTop: '40px',
        }
    };

    return (
        <div id={id} style={STYLES.container}>
            {/* Header */}
            <div style={STYLES.header}>
                <div>
                    <h1 style={STYLES.title}>KisanSetu</h1>
                    <p style={STYLES.subtitle}>Digital Agri-Commerce Platform</p>
                    <div style={{ marginTop: '24px' }}>
                        <p style={STYLES.label}>Invoice Number</p>
                        <p style={{ ...STYLES.value, fontSize: '18px' }}>{data.invoiceId}</p>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={STYLES.roleBadge}>
                        {data.role} INVOICE
                    </div>
                    <div>
                        <div style={{ marginBottom: '16px' }}>
                            <p style={STYLES.label}>Date Issued</p>
                            <p style={STYLES.value}>{data.date}</p>
                        </div>
                        <div>
                            <p style={STYLES.label}>Order ID</p>
                            <p style={STYLES.value}>#{data.orderId.substring(0, 12).toUpperCase()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Participants */}
            <div style={STYLES.grid}>
                <div style={STYLES.column}>
                    <h3 style={STYLES.sectionTitle}>
                        {isBuyer ? 'Billing Details' : isFarmer ? 'Seller Information' : isTransporter ? 'Service Provider' : 'Platform Admin'}
                    </h3>
                    {isBuyer && data.buyer && (
                        <div>
                            <p style={STYLES.addressTitle}>{data.buyer.name}</p>
                            <p style={{ ...STYLES.value, color: '#6b7280', fontSize: '14px' }}>{data.buyer.email}</p>
                            <p style={STYLES.addressText}>{data.buyer.address}</p>
                        </div>
                    )}
                    {isFarmer && data.farmer && (
                        <div>
                            <p style={STYLES.addressTitle}>{data.farmer.name}</p>
                            <p style={STYLES.label}>Farmer ID: {data.farmer.farmerId}</p>
                            <p style={STYLES.addressText}>{data.farmer.location}</p>
                        </div>
                    )}
                    {isTransporter && data.transporter && (
                        <div>
                            <p style={STYLES.addressTitle}>{data.transporter.name}</p>
                            <p style={STYLES.label}>Transporter ID: {data.transporter.transporterId}</p>
                            <p style={{ ...STYLES.value, marginTop: '8px' }}>Vehicle: {data.transporter.vehicleType}</p>
                            <p style={{ color: '#6b7280', fontSize: '12px' }}>{data.transporter.licensePlate}</p>
                        </div>
                    )}
                    {isAdmin && (
                        <div>
                            <p style={STYLES.addressTitle}>KisanSetu Admin</p>
                            <p style={{ ...STYLES.value, color: '#6b7280', fontSize: '14px' }}>support@kisansetu.com</p>
                            <p style={STYLES.addressText}>Global Operations Desk</p>
                        </div>
                    )}
                </div>

                <div style={STYLES.column}>
                    <h3 style={STYLES.sectionTitle}>
                        {isBuyer ? 'Seller / Farm' : 'Transaction Counterparty'}
                    </h3>
                    {(isBuyer && data.farmer) && (
                        <div>
                            <p style={STYLES.addressTitle}>{data.farmer.name}</p>
                            <p style={STYLES.addressText}>{data.farmer.location}</p>
                        </div>
                    )}
                    {(isFarmer && data.buyer) && (
                        <div>
                            <p style={STYLES.addressTitle}>{data.buyer.name}</p>
                            <p style={STYLES.addressText}>{data.buyer.location}</p>
                            <p style={{ ...STYLES.label, marginTop: '8px', fontStyle: 'italic' }}>Buyer contact info hidden for privacy</p>
                        </div>
                    )}
                    {isAdmin && (
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div style={{ flex: 1 }}>
                                <p style={STYLES.label}>Buyer</p>
                                <p style={STYLES.value}>{data.buyer?.name}</p>
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={STYLES.label}>Farmer</p>
                                <p style={STYLES.value}>{data.farmer?.name}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Line Items Table */}
            <table style={STYLES.table}>
                <thead>
                    <tr>
                        <th style={STYLES.th}>Description</th>
                        {(isBuyer || isFarmer || isAdmin) && (
                            <>
                                <th style={{ ...STYLES.th, textAlign: 'center' }}>Unit Price</th>
                                <th style={{ ...STYLES.th, textAlign: 'center' }}>Qty</th>
                            </>
                        )}
                        {isTransporter && (
                            <>
                                <th style={{ ...STYLES.th, textAlign: 'center' }}>Rate/km</th>
                                <th style={{ ...STYLES.th, textAlign: 'center' }}>Distance</th>
                            </>
                        )}
                        <th style={{ ...STYLES.th, textAlign: 'right' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {data.items.map((item, idx) => (
                        <tr key={idx}>
                            <td style={STYLES.td}>
                                <p style={STYLES.itemName}>{item.name}</p>
                                {item.grade && (
                                    <span style={STYLES.grade}>Grade: {item.grade}</span>
                                )}
                            </td>
                            {(isBuyer || isFarmer || isAdmin) && (
                                <>
                                    <td style={{ ...STYLES.td, textAlign: 'center' }}>₹{item.pricePerUnit.toLocaleString()}</td>
                                    <td style={{ ...STYLES.td, textAlign: 'center' }}>{item.quantity} {item.unit}</td>
                                </>
                            )}
                            {isTransporter && data.delivery && (
                                <>
                                    <td style={{ ...STYLES.td, textAlign: 'center' }}>₹{data.delivery.ratePerKm}</td>
                                    <td style={{ ...STYLES.td, textAlign: 'center' }}>{data.delivery.distance} km</td>
                                </>
                            )}
                            <td style={{ ...STYLES.td, textAlign: 'right', fontWeight: '900' }}>₹{item.total.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Summary Section */}
            <div style={STYLES.summary}>
                <div style={{ flex: 1 }}>
                    <h4 style={STYLES.sectionTitle}>Payment Information</h4>
                    <div style={STYLES.summaryCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280' }}>Method</span>
                            <span style={STYLES.value}>{data.paymentStatus.method}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280' }}>Status</span>
                            <span style={{
                                fontSize: '10px',
                                fontWeight: '900',
                                backgroundColor: data.paymentStatus.status === 'PAID' ? '#dcfce7' : '#fef3c7',
                                color: data.paymentStatus.status === 'PAID' ? '#15803d' : '#b45309',
                                padding: '2px 8px',
                                borderRadius: '4px'
                            }}>
                                {data.paymentStatus.status}
                            </span>
                        </div>
                        {data.paymentStatus.transactionId && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280' }}>Trx ID</span>
                                <span style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'monospace' }}>{data.paymentStatus.transactionId}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div style={STYLES.totalSection}>
                    <div style={STYLES.totalRow}>
                        <span>SUBTOTAL</span>
                        <span style={{ color: '#111827' }}>₹{data.breakdown.itemTotal.toLocaleString()}</span>
                    </div>
                    {data.breakdown.transportCharges !== undefined && (
                        <div style={STYLES.totalRow}>
                            <span>TRANSPORT</span>
                            <span style={{ color: '#111827' }}>₹{data.breakdown.transportCharges.toLocaleString()}</span>
                        </div>
                    )}
                    <div style={STYLES.totalRow}>
                        <span>{isBuyer ? 'PLATFORM FEE' : 'COMMISSION'}</span>
                        <span style={{ color: isBuyer ? '#111827' : '#ef4444' }}>
                            {isBuyer ? '' : '-'}₹{data.breakdown.platformFee.toLocaleString()}
                        </span>
                    </div>
                    <div style={STYLES.totalRow}>
                        <span>TAXES</span>
                        <span style={{ color: '#111827' }}>₹{data.breakdown.taxes.toLocaleString()}</span>
                    </div>
                    <div style={STYLES.finalTotal}>
                        <span style={STYLES.finalLabel}>{isBuyer ? 'Total Amount' : 'Net Earnings'}</span>
                        <span style={STYLES.finalValue}>₹{data.breakdown.finalTotal.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Footer / QR */}
            <div style={STYLES.footer}>
                <div style={{ flex: 1 }}>
                    <h5 style={{ ...STYLES.finalLabel, fontSize: '10px', fontStyle: 'italic', marginBottom: '12px' }}>Authorized Invoice</h5>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#9ca3af', lineHeight: '1.6', maxWidth: '400px', margin: '0' }}>
                        Thank you for being part of India's direct farm-to-door network. This is a computer-generated document and requires no physical signature.
                    </p>
                    <div style={{ display: 'flex', gap: '32px', marginTop: '32px' }}>
                        <div>
                            <p style={{ ...STYLES.label, color: '#d1d5db', marginBottom: '4px' }}>Support</p>
                            <p style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', margin: '0' }}>kisansetu.com/support</p>
                        </div>
                        <div>
                            <p style={{ ...STYLES.label, color: '#d1d5db', marginBottom: '4px' }}>Legal</p>
                            <p style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', margin: '0' }}>T&C apply. GST Compliant.</p>
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'center', width: '120px' }}>
                    <div style={{
                        backgroundColor: '#f9fafb',
                        padding: '12px',
                        borderRadius: '24px',
                        border: '2px solid #f3f4f6',
                        display: 'inline-block',
                        marginBottom: '8px'
                    }}>
                        <QRCodeSVG value={`https://kisansetu.com/orders/${data.orderId}`} size={80} level="H" />
                    </div>
                    <p style={STYLES.label}>Scan to Verify</p>
                </div>
            </div>
        </div>
    );
};

export default Invoice;
