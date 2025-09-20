import * as FileSystem from 'expo-file-system/legacy'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { supabase } from '../lib/supabaseAdmin'

const cfg = {
  company: {
    name: 'GREEN HANGAR EMISSION TESTING CENTER',
    details: [
      'PROPRIETOR: JONALIZ L. CABALUNA',
      'ATAYDE ST. BRGY. 191 PASAY CITY',
      'VAT REG. TIN: 234892-00000',
    ],
  },
  client: {
    billToLabel: 'BILL TO',
    name: 'PHILIPPINES AIR ASIA INC.',
    details: [
      '2nd LEVEL MEZZANINE AREA NAIA T3, PASAY CITY',
      'TIN# 005-838-00016',
    ],
  },
  invoice: {
    headerLabel: 'SALES INVOICE NO.',
    unit: 'PCS',
    descriptionPrefix: 'PIRs Luggage Delivery',
    fillerRowsCount: 5,
    noteAllOriginalDocs: ' Note: All Original Documents are included in this statement',
    notePayableText: 'Note: Please make check payable to JONALIZ L. CABALUNA',
    bankInfo: 'RCBC ACCT NUMBER: 7591033191',
    signatureLabels: {
      prepared: 'PREPARED BY',
      checked: 'CHECKED BY',
      preparedSubtitle: 'Revenue Supervisor',
      checkedSubtitle: 'ACCOUNTING',
    },
    paymentMethodDefault: 'DOMESTIC FUND TRANSFER',
  },
}

const generateTransactionReportHTML = async (
  transactions,
  invoiceImageUrl = null,
  signatureImageUrl = null,
  options = {},
  invoiceData = null
) => {
  // Get the first and last day of the current month
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  
  // Format dates with dd/mm/yyyy format
  const formatDate = (date) => {
    if (!date) return 'N/A'
    const dateObj = new Date(date)
    const day = dateObj.getDate().toString().padStart(2, '0')
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
    const year = dateObj.getFullYear()
    const hours = dateObj.getHours().toString().padStart(2, '0')
    const minutes = dateObj.getMinutes().toString().padStart(2, '0')
    const ampm = dateObj.getHours() >= 12 ? 'PM' : 'AM'
    
    return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`
  }
  
  const dateRange = `${formatDate(firstDay)} TO ${formatDate(lastDay)}`
  const generatedDateTime = formatDate(new Date())


  // Fetch contract data for each transaction
  const contractData = await Promise.all(transactions.map(async (transaction) => {
    const { data, error } = await supabase
      .from('contracts')
      .select(`
        id,
        contract_status:contract_status_id (status_name),
        delivery_charge,
        delivery_surcharge,
        delivery_discount,
        remarks,
        passenger_form,
        delivery_address,
        address_line_1,
        address_line_2,
        delivered_at,
        cancelled_at,
        owner_first_name,
        owner_middle_initial,
        owner_last_name,
        owner_contact,
        luggage_description,
        luggage_quantity,
        flight_number,
        passenger_id,
        proof_of_delivery
      `)
      .eq('summary_id', transaction.summary_id)

    if (error) {
      console.error('Error fetching contract data:', error)
      return null
    }

    return data
  }))

  // Calculate total amount from all contracts
  const totalAmount = contractData.reduce((sum, contracts) => {
    if (!contracts) return sum
    return sum + contracts.reduce((contractSum, contract) => {
      const amount = (contract.delivery_charge || 0) + (contract.delivery_surcharge || 0) - (contract.delivery_discount || 0)
      return contractSum + amount
    }, 0)
  }, 0)

  // Format PHP currency with commas and 2 decimal places
  const formatPHP = (value) => {
    const num = Number(value || 0)
    return num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Format transactions for the table
  let rowCounter = 1; // Add counter for sequential numbering
  const formattedTransactions = contractData.flatMap((contracts, transactionIndex) => {
    if (!contracts || contracts.length === 0) {
      return `
        <tr>
          <td>${rowCounter++}</td>
          <td>${transactions[transactionIndex].summary_id}</td>
          <td>N/A</td>
          <td>N/A</td>
          <td>N/A</td>
          <td>N/A</td>
          <td>N/A</td>
          <td class="amount">₱${formatPHP(0)}</td>
          <td>N/A</td>
        </tr>
      `
    }

    // Return one row per contract
    return contracts.map((contract) => {
      // Build owner name from individual fields
      const ownerName = [
        contract.owner_first_name,
        contract.owner_middle_initial,
        contract.owner_last_name
      ].filter(Boolean).join(' ') || 'N/A'

      const amount = (contract.delivery_charge || 0) + (contract.delivery_surcharge || 0) - (contract.delivery_discount || 0)

      return `
        <tr>
          <td>${rowCounter++}</td>
          <td>${contract.id}</td>
          <td>${ownerName}</td>
          <td>${contract.flight_number || 'N/A'}</td>
          <td>${(() => {
            const parts = [contract.delivery_address, contract.address_line_1, contract.address_line_2]
              .map(v => (v || '').toString().trim())
              .filter(Boolean)
            return parts.length ? parts.join(', ') : 'N/A'
          })()}</td>
          <td>${formatDate(contract.delivered_at || contract.cancelled_at)}</td>
          <td>${contract.contract_status?.status_name || 'N/A'}</td>
          <td class="amount">₱${formatPHP(amount)}</td>
          <td>${contract.remarks || 'N/A'}</td>
        </tr>
      `
    }).join('')
  }).join('')

  // Filter out transactions without passenger forms
  const transactionsWithForms = contractData.flatMap(contracts => 
    contracts?.filter(contract => contract.passenger_form || contract.proof_of_delivery) || []
  )
  
  // Generate HTML for passenger forms
  const formPages = transactionsWithForms.map((contract, index) => {
    const imageUrl = contract.passenger_form || contract.proof_of_delivery;
    return `
      <div class="page-break"></div>
      <div class="form-container">
        <img src="${imageUrl}" class="form-image" />
        <div class="form-info">
          Contract ID: ${contract.id}, Page ${index + 1} of ${transactionsWithForms.length}
        </div>
      </div>
    `;
  }).join('')

  // Generate invoice image HTML if available
  const invoiceImageHTML = invoiceImageUrl ? `
    <div class="invoice-container">
      <img src="${invoiceImageUrl}" class="invoice-image" />
    </div>
  ` : ''

  // Generate invoice HTML if invoiceData is provided
  let invoiceHTML = ''
  if (invoiceData) {
    const {
      invoice_id,
      summary_id,
      date,
      due_date,
      terms = '30 DAYS',
      payment_method: paymentMethodRaw
    } = invoiceData
    const paymentMethod = paymentMethodRaw || cfg.invoice.paymentMethodDefault

    // Format date for invoice
    const formatInvoiceDate = (date) => {
      if (!date) return 'N/A'
      const dateObj = new Date(date)
      const day = dateObj.getDate().toString().padStart(2, '0')
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
      const year = dateObj.getFullYear()
      return `${day}/${month}/${year}`
    }

    // Build signature section for the invoice page
    let invoiceSignatureHTML = ''
    // Build signature section variant for the post-Table2 left block
    let postSignatureHTML = ''
    if (options?.signatureOnFirstPage) {
      if (typeof signatureImageUrl === 'string') {
        invoiceSignatureHTML = `
          <div class="signature-duo">
            <div class="signature-box">
              <div class="signature-image-container">
                <img src="${signatureImageUrl}" class="signature-image" />
              </div>
              <div class="signature-underline"></div>
              <div class="signature-label">${cfg.invoice.signatureLabels.prepared}</div>
            </div>
            <div class="signature-box">
              <div class="signature-underline"></div>
              <div class="signature-label">${cfg.invoice.signatureLabels.checked}</div>
            </div>
          </div>
        `
      } else if (typeof signatureImageUrl === 'object' && signatureImageUrl) {
        const preparedUrl = signatureImageUrl.prepared || ''
        const checkedUrl = signatureImageUrl.checked || ''
        const preparedRotation = Number(signatureImageUrl.preparedRotation || 0)
        const checkedRotation = Number(signatureImageUrl.checkedRotation || 0)

        const preparedBlock = preparedUrl
          ? `
            <div class="signature-box">
              <div class="signature-image-container">
                <img src="${preparedUrl}" class="signature-image" style="transform: rotate(${preparedRotation}deg);" />
              </div>
              <div class="signature-underline"></div>
              <div class="signature-label">${cfg.invoice.signatureLabels.prepared}</div>
            </div>
          `
          : `
            <div class="signature-box">
              <div class="signature-underline"></div>
              <div class="signature-label">${cfg.invoice.signatureLabels.prepared}</div>
            </div>
          `

        const checkedBlock = checkedUrl
          ? `
            <div class="signature-box">
              <div class="signature-image-container">
                <img src="${checkedUrl}" class="signature-image" style="transform: rotate(${checkedRotation}deg);" />
              </div>
              <div class="signature-underline"></div>
              <div class="signature-label">${cfg.invoice.signatureLabels.checked}</div>
            </div>
          `
          : `
            <div class="signature-box">
              <div class="signature-underline"></div>
              <div class="signature-label">${cfg.invoice.signatureLabels.checked}</div>
            </div>
          `

        invoiceSignatureHTML = `
          <div class="signature-duo">
            ${preparedBlock}
            ${checkedBlock}
          </div>
        `
        // Post-table signature variant aligned side-by-side with inline labels and subtitles
        const preparedBlockPost = `
          <div class="signature-cell">
            <div class="signature-label">${cfg.invoice.signatureLabels.prepared}:</div>
            ${preparedUrl ? `<div class="signature-image-container-inline"><img src="${preparedUrl}" class="signature-image" style="transform: rotate(${preparedRotation}deg);" /></div>` : `<div class="signature-placeholder"></div>`}
          </div>
        `
        const checkedBlockPost = `
          <div class="signature-cell">
            <div class="signature-label">${cfg.invoice.signatureLabels.checked}:</div>
            ${checkedUrl ? `<div class="signature-image-container-inline"><img src="${checkedUrl}" class="signature-image" style="transform: rotate(${checkedRotation}deg);" /></div>` : `<div class="signature-placeholder"></div>`}
          </div>
        `
        postSignatureHTML = `
          <div class="signature-row">
            ${preparedBlockPost}
            ${checkedBlockPost}
          </div>
        `
      } else {
        invoiceSignatureHTML = `
          <div class="signature-duo">
            <div class="signature-box">
              <div class="signature-underline"></div>
              <div class="signature-label">${cfg.invoice.signatureLabels.prepared}</div>
            </div>
            <div class="signature-box">
              <div class="signature-underline"></div>
              <div class="signature-label">${cfg.invoice.signatureLabels.checked}</div>
            </div>
          </div>
        `
        postSignatureHTML = `
          <div class="signature-row">
            <div class="signature-cell">
              <div class="signature-label">${cfg.invoice.signatureLabels.prepared}:</div>
              <div class="signature-placeholder"></div>
            </div>
            <div class="signature-cell">
              <div class="signature-label">${cfg.invoice.signatureLabels.checked}:</div>
              <div class="signature-placeholder"></div>
            </div>
          </div>
        `
      }
    } else {
      invoiceSignatureHTML = `
        <div class="signature-duo">
          <div class="signature-box">
            <div class="signature-underline"></div>
            <div class="signature-label">${cfg.invoice.signatureLabels.prepared}</div>
          </div>
          <div class="signature-box">
            <div class="signature-underline"></div>
            <div class="signature-label">${cfg.invoice.signatureLabels.checked}</div>
          </div>
        </div>
      `
      postSignatureHTML = `
        <div class="signature-row">
          <div class="signature-cell">
            <div class="signature-label">${cfg.invoice.signatureLabels.prepared}:</div>
            <div class="signature-placeholder"></div>
          </div>
          <div class="signature-cell">
            <div class="signature-label">${cfg.invoice.signatureLabels.checked}:</div>
            <div class="signature-placeholder"></div>
          </div>
        </div>
      `
    }

    invoiceHTML = `
      <div class="invoice-page">
        <div class="invoice-header">
          <div class="invoice-header-left">
            <div class="company-name">${cfg.company.name}</div>
            ${cfg.company.details.map(d => `<div class="company-details">${d}</div>`).join('')}
          </div>
          <div class="invoice-header-right">
            <div class="bill-to">${cfg.client.billToLabel}</div>
            <div class="client-info">${cfg.client.name}</div>
            ${cfg.client.details.map(d => `<div class=\"client-info\">${d}</div>`).join('')}
          </div>
        </div>

        <div class="invoice-meta">
          <div class="meta-item">
            <span class="meta-label">DATE:</span>
            <span class="meta-value">${formatInvoiceDate(date)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">SOA #:</span>
            <span class="meta-value">${summary_id || 'N/A'}</span>
          </div>
        </div>

        <div class="invoice-header2">
          ${cfg.invoice.headerLabel} ${invoice_id || 'N/A'}
        </div>

        <table class="invoice-content-table">
          <thead>
            <tr>
              <th>TERMS</th>
              <th>PAYMENT METHOD</th>
              <th>DUE DATE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${terms}</td>
              <td>${paymentMethod}</td>
              <td>${formatInvoiceDate(due_date)}</td>
            </tr>
            <tr>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <table class="invoice-content-table">
          <thead>
            <tr>
              <th>QTY</th>
              <th>UNIT</th>
              <th>DESCRIPTION</th>
              <th>TOTAL AMOUNT DUE</th>
            </tr>
          </thead>
          <tbody>
            ${(() => {
              const qty = Math.max(0, (rowCounter || 1) - 1)
              const formatInvDate = (d) => {
                const dd = String(d.getDate()).padStart(2, '0')
                const mm = String(d.getMonth() + 1).padStart(2, '0')
                const yyyy = d.getFullYear()
                return `${dd}/${mm}/${yyyy}`
              }
              const desc = `${cfg.invoice.descriptionPrefix} - (${formatInvDate(new Date())} to ${formatInvoiceDate(due_date)})`
              const mainRow = `
                <tr>
                  <td style="text-align:center;">${qty}</td>
                  <td style="text-align:center;">${cfg.invoice.unit}</td>
                  <td>${desc}</td>
                  <td>PHP</td>
                </tr>
              `
              const fillerRowsCount = cfg.invoice.fillerRowsCount
              const filler = Array.from({ length: fillerRowsCount })
                .map(() => `
                  <tr>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                `)
                .join('')
              return mainRow + filler
            })()}
            <tr>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td style="font-weight:bold">${cfg.invoice.noteAllOriginalDocs}</td>
              <td>&nbsp;</td>
            </tr>
            <tr>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
            <tr>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
            <tr>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td class="amount">Total Amount Due: PHP${formatPHP(totalAmount || 0)}</td>
            </tr>
          </tbody>
        </table>
        <div class="invoice-footer">
          <div class="post-columns">
            <div class="post-left">
              <div class="note-payable">${cfg.invoice.notePayableText}</div>
              ${postSignatureHTML}
              <br></br>
              <div class="received-row">
                <div class="received-cell">
                  <div class="received-label">RECEIVED BY:</div>
                  <span class="received-fill"></span>
                </div>
                <div class="received-cell">
                  <div class="received-label">DATE:</div>
                  <span class="received-fill" style="max-width: 220px;"></span>
                </div>
              </div>
            </div>
            <div class="post-right">
              <div class="bank-info">${cfg.invoice.bankInfo}</div>
              <table class="table3">
                <tbody>
                  ${(() => {
                    const grossTotal = Number(totalAmount || 0)
                    const vatable = grossTotal / 1.12
                    const totalVat = grossTotal - vatable
                    const amountDue = grossTotal
                    return `
                      <tr>
                        <td>VATABLE</td>
                        <td class="amount">₱${formatPHP(vatable)}</td>
                      </tr>
                      <tr>
                        <td>VAT EXEMPT</td>
                        <td class="amount">₱${formatPHP(0)}</td>
                      </tr>
                      <tr>
                        <td>ZERO RATED</td>
                        <td class="amount">₱${formatPHP(0)}</td>
                      </tr>
                      <tr>
                        <td style="font-weight:bold;">TOTAL SALES</td>
                        <td class="amount">₱${formatPHP(vatable)}</td>
                      </tr>
                      <tr>
                        <td style="font-weight:bold;">TOTAL VAT</td>
                        <td class="amount">₱${formatPHP(totalVat)}</td>
                      </tr>
                      <tr class="amount-due-row">
                        <td style="font-weight:bold;">AMOUNT DUE</td>
                        <td class="amount">₱${formatPHP(amountDue)}</td>
                      </tr>
                    `
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `
  }

  // Signature first page disabled to ensure invoice is the first page

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          @page {
            margin: 0;
            padding: 0;
          }
          body { 
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            font-size: 10px;
          }
          .header { 
            text-align: center; 
            margin-bottom: 10px;
            font-size: 14px;
            font-weight: bold;
          }
          table { 
            width: 100%; 
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 7px;
          }
          th, td { 
            border: 1px solid #000; 
            padding: 2px; 
            text-align: left;
            word-wrap: break-word;
            max-width: 80px;
          }
          th { 
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
          }
          .summary-container {
            display: block;
            padding: 20px;
            box-sizing: border-box;
          }
          .summary-content {
            /* Fill remaining page height without forcing overflow to a new page */
            min-height: calc(100vh - 180px); /* ~footer + spacing allowance + padding */
          }
          .footer {
            margin-top: 12px;
            font-size: 9px;
            width: 100%;
            /* keep footer with its content and avoid creating a trailing blank page */
            page-break-inside: avoid;
            page-break-before: avoid;
            break-inside: avoid;
            break-before: avoid;
            break-after: avoid;
          }
          .footer-line1 {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .footer-line2 {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-weight: bold;
          }
          .footer-line3 {
            text-align: right;
          }
          .nowrap { white-space: nowrap; }
          .amount {
            text-align: right;
          }
          .total-row {
            font-weight: bold;
            background-color: #f5f5f5;
          }
          .page-break {
            page-break-before: always;
            break-before: page;
          }
          .form-container {
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          .form-image {
            width: 100%;
            height: calc(100vh - 40px);
            object-fit: contain;
          }
          .form-info {
            font-family: Arial, sans-serif;
            font-size: 10px;
            color: #666;
            text-align: center;
            width: 100%;
            padding: 10px;
            background-color: #fff;
          }
          .invoice-container {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          
          .invoice-image {
            width: 100%;
            height: calc(100vh - 40px);
            object-fit: contain;
          }
          
          .signature-box {
            width: 220px;
            height: 70px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .signature-image-container {
            width: 100%;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 5px;
          }
          .signature-underline {
            width: 100%;
            height: 1px;
            background-color: #000;
            margin-bottom: 5px;
          }
          .signature-duo {
            display: flex;
            gap: 24px;
            justify-content: center;
            align-items: flex-start;
            width: 100%;
          }
          .signature-label {
            font-size: 10px;
            margin-top: 6px;
            text-align: center;
          }
          .signature-image {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
          /* Invoice page styles */
          .invoice-page {
            padding: 20px;
            font-size: 12px;
            line-height: 1.3;
            min-height: calc(100vh - 40px); /* subtract padding to avoid overflow to blank page */
            box-sizing: border-box;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .invoice-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
          }
          .invoice-header-left {
            flex: 1;
          }
          .invoice-header-right {
            flex: 1;
            text-align: right;
          }
          .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .company-details {
            font-size: 11px;
            margin-bottom: 3px;
          }
          .bill-to {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .client-info {
            font-size: 11px;
            margin-bottom: 3px;
          }
          .invoice-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 11px;
          }
          .meta-item {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
          }
          .meta-label {
            font-weight: bold;
            margin-right: 10px;
            min-width: 80px;
          }
          .meta-value {
            border-bottom: 1px solid #000;
            padding: 2px 5px;
            min-width: 150px;
          }
          .invoice-header2 {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 20px;
            text-decoration: underline;
          }
          .invoice-content-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .invoice-content-table th,
          .invoice-content-table td {
            border: 1px solid #000;
            padding: 10px;
            text-align: left;
          }
          .invoice-content-table th {
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
          }
          .invoice-signatures {
            margin-top: 25px;
            text-align: center;
          }
          .invoice-table-title {
            text-align: center;
            font-size: 12px;
            font-weight: bold;
            margin: 8px 0 6px;
          }
          .invoice-signatures .signature-duo {
            display: flex;
            gap: 100px;
            justify-content: center;
            align-items: flex-start;
          }
          .invoice-signatures .signature-box {
            width: 200px;
            height: 80px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin-bottom: 10px;
          }
          .invoice-signatures .signature-image-container {
            width: 100%;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 5px;
          }
          .invoice-signatures .signature-underline {
            width: 100%;
            height: 1px;
            background-color: #000;
            margin-bottom: 5px;
          }
          .invoice-signatures .signature-label {
            font-size: 11px;
            text-align: center;
          }
          /* Post-Table2 custom layout */
          .post-table2-cell {
            padding: 6px 8px;
          }
          .post-columns {
            display: grid;
            grid-template-columns: 2fr 1fr; /* align roughly with DESCRIPTION vs AMOUNT */
            gap: 16px;
            align-items: start;
          }
          .post-left {}
          .post-right {}
          .note-payable {
            font-size: 11px;
            margin-bottom: 8px;
            font-weight: bold;
          }
          .received-line { display:none; }
          .received-row { display: flex; gap: 24px; margin-top: 8px; justify-content: space-between; }
          .received-cell { display: flex; align-items: center; gap: 8px; flex: 1; }
          .received-label { font-size: 10px; font-weight: bold; }
          .received-fill { flex: 1; display: inline-block; border-bottom: 1px solid #000; height: 1px; min-width: 140px; }
          .bank-info {
            font-size: 11px;
            margin-bottom: 6px;
            font-weight: bold;
            text-align: right;
          }
          .table3 {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          .table3 td {
            border: 1px solid #000;
            padding: 6px 8px;
          }
          /* Remove top/bottom borders for specific rows in the totals table */
          .table3 tr.no-tb-border td { border-top: none; border-bottom: none; }
          .table3 tr:nth-last-child(-n+3) td { border-top: none; border-bottom: none; }
          .table3 tr.amount-due-row td { border-bottom: 1px solid #000 !important; }
          /* Post signature blocks */
          .signature-row { display: flex; gap: 24px; margin-top: 8px; justify-content: space-between; }
          .signature-cell { display: flex; align-items: center; gap: 8px; flex: 1; }
          .signature-label { font-size: 10px; font-weight: bold; }
          .signature-placeholder { width: 180px; height: 48px; border-bottom: 1px solid #000; }
          .signature-image-container-inline {
            width: 180px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-bottom: 1px solid #000;
          }
          .signature-image-container-inline img.signature-image { width: 180px; max-height: 48px; object-fit: contain; }
          .signature-box-post {
            width: 220px;
            height: 70px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            flex-direction: column;
          }
          .signature-label-post {
            font-size: 10px;
            margin-top: 6px;
            text-align: center;
          }
          .signature-subtitle-post {
            font-size: 9px;
            text-align: center;
          }
          
        </style>
      </head>
      <body>
        ${invoiceHTML}
        ${invoiceHTML ? '<div class="page-break"></div>' : ''}
        <div class="summary-container">
          <div class="summary-content">
            <div class="header">
              GHE TRANSMITTAL - AIRPORT CLIENTS PROPERTY IRREGULARITY SUMMARY REPORT<br>
              ${dateRange}
            </div>
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Tracking ID</th>
                  <th>Luggage Owner</th>
                  <th>Flight No.</th>
                  <th>Address</th>
                  <th>Date Received</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${formattedTransactions}
                <tr class="total-row">
                  <td colspan="8">TOTAL</td>
                  <td class="amount">₱${formatPHP(totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="footer">
            <div class="footer-line1">
              <div>(Received by: _________________&nbsp;&nbsp;&nbsp;&nbsp;Date: _________________)</div>
              <div class="nowrap">GENERATED ON: ${generatedDateTime}</div>
            </div>
            <div class="footer-line2">
              <div>AIRLINE'S REPRESENTATIVE</div>
              <div class="nowrap">*********SUBMITTED ALL ORIGINAL SIGNED PIR**********</div>
            </div>
            <div class="footer-line3">
              Total PIR Submitted: ${rowCounter - 1}
            </div>
          </div>
        </div>
        ${formPages}
      </body>
    </html>
  `
}

export const printPDF = async (
  transactions,
  invoiceImageUrl = null,
  signatureImageUrl = null,
  options = {},
  printerUrl = null,
  invoiceData = null
) => {
  try {
    if (!transactions || (Array.isArray(transactions) && transactions.length === 0)) {
      throw new Error('Transactions are required')
    }

    const html = await generateTransactionReportHTML(
      transactions,
      invoiceImageUrl,
      signatureImageUrl,
      options,
      invoiceData
    )

    await Print.printAsync({
      html,
      printerUrl,
      width: 612, // US Letter width in points
      height: 792, // US Letter height in points
    })
  } catch (error) {
    console.error('Error printing PDF:', error)
    throw new Error(`Failed to print PDF: ${error.message}`)
  }
}

export const sharePDF = async (
  transactions,
  invoiceImageUrl = null,
  signatureImageUrl = null,
  options = {},
  invoiceData = null
) => {
  try {
    if (!transactions || transactions.length === 0) {
      throw new Error('Transactions are required');
    }

    const html = await generateTransactionReportHTML(
      transactions,
      invoiceImageUrl,
      signatureImageUrl,
      options,
      invoiceData
    );

    const { uri } = await Print.printToFileAsync({ html });

    const summaryId = transactions[0]?.summary_id || 'SUMMARY';
    const filename = `${summaryId}.pdf`;
    const newPath = `${FileSystem.documentDirectory}${filename}`;

    await FileSystem.moveAsync({
      from: uri,
      to: newPath,
    });

    await Sharing.shareAsync(newPath, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Transaction Report',
      UTI: 'com.adobe.pdf',
    });
  } catch (error) {
    console.error('Error sharing PDF:', error);
    throw new Error(`Failed to share PDF: ${error.message}`);
  }
}

export const createPDFFile = async (
  transactions,
  invoiceImageUrl = null,
  signatureImageUrl = null,
  options = {},
  invoiceData = null
) => {
  try {
    if (!transactions || (Array.isArray(transactions) && transactions.length === 0)) {
      throw new Error('Transactions are required')
    }

    const html = await generateTransactionReportHTML(
      transactions,
      invoiceImageUrl,
      signatureImageUrl,
      options,
      invoiceData
    )

    const summaryId = transactions[0]?.summary_id || 'SUMMARY'
    const filename = `${summaryId}.pdf`

    const { uri } = await Print.printToFileAsync({ html })

    const newPath = `${FileSystem.documentDirectory}${filename}`
    await FileSystem.moveAsync({ from: uri, to: newPath })

    return { path: newPath, filename }
  } catch (error) {
    console.error('Error creating PDF file:', error)
    throw new Error(`Failed to create PDF file: ${error.message}`)
  }
}