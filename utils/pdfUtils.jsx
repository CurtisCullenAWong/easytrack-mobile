import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { supabase } from '../lib/supabaseAdmin'

const generateTransactionReportHTML = async (transactions, summary, date, time, invoiceImageUrl = null) => {
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
      .from('contract')
      .select(`
        id,
        contract_status:contract_status_id (status_name),
        delivery_charge,
        surcharge,
        discount,
        remarks,
        passenger_form,
        drop_off_location,
        delivered_at,
        cancelled_at,
        luggage_info:contract_luggage_information (
          luggage_owner,
          quantity,
          case_number,
          item_description,
          weight,
          contact_number,
          flight_number
        )
      `)
      .eq('payment_id', transaction.payment_id)

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
      const baseAmount = (contract.delivery_charge || 0) + (contract.surcharge || 0)
      const discountedAmount = baseAmount * (1 - ((contract.discount || 0) / 100))
      return contractSum + discountedAmount
    }, 0)
  }, 0)

  // Format transactions for the table
  let rowCounter = 1; // Add counter for sequential numbering
  const formattedTransactions = contractData.flatMap((contracts, transactionIndex) => {
    if (!contracts || contracts.length === 0) {
      return `
        <tr>
          <td>${rowCounter++}</td>
          <td>${transactions[transactionIndex].payment_id}</td>
          <td>N/A</td>
          <td>N/A</td>
          <td>N/A</td>
          <td>N/A</td>
          <td>N/A</td>
          <td class="amount">₱0.00</td>
          <td>N/A</td>
        </tr>
      `
    }

    // Return one row per contract's luggage item
    return contracts.flatMap((contract, contractIndex) => {
      if (!contract.luggage_info || contract.luggage_info.length === 0) {
        return `
          <tr>
            <td>${rowCounter++}</td>
            <td>${contract.id}</td>
            <td>N/A</td>
            <td>N/A</td>
            <td>${contract.drop_off_location || 'N/A'}</td>
            <td>${formatDate(contract.delivered_at || contract.cancelled_at)}</td>
            <td>${contract.contract_status?.status_name || 'N/A'}</td>
            <td class="amount">₱${((contract.delivery_charge || 0) + (contract.surcharge || 0)).toFixed(2)}</td>
            <td>${contract.remarks || ' '}</td>
          </tr>
        `
      }

      return contract.luggage_info.map((luggage, luggageIndex) => `
        <tr>
          <td>${rowCounter++}</td>
          <td>${contract.id}</td>
          <td>${luggage.luggage_owner || 'N/A'}</td>
          <td>${luggage.flight_number || 'N/A'}</td>
          <td>${contract.drop_off_location || 'N/A'}</td>
          <td>${formatDate(contract.delivered_at || contract.cancelled_at)}</td>
          <td>${contract.contract_status?.status_name || 'N/A'}</td>
          <td class="amount">₱${((contract.delivery_charge || 0) + (contract.surcharge || 0)).toFixed(2)}</td>
          <td>${contract.remarks || ' '}</td>
        </tr>
      `).join('')
    }).join('')
  }).join('')

  // Filter out transactions without passenger forms
  const transactionsWithForms = contractData.flatMap(contracts => 
    contracts?.filter(contract => contract.passenger_form) || []
  )
  
  // Generate HTML for passenger forms
  const formPages = transactionsWithForms.map((contract, index) => `
    <div class="page-break"></div>
    <div class="form-container">
      <img src="${contract.passenger_form}" class="form-image" />
      <div class="form-info">
        Contract ID: ${contract.id} | Amount: ₱${((contract.delivery_charge || 0) + (contract.surcharge || 0)).toFixed(2)} | Page ${index + 1} of ${transactionsWithForms.length}
      </div>
    </div>
  `).join('')

  // Generate invoice image HTML if available
  const invoiceImageHTML = invoiceImageUrl ? `
    <div class="invoice-container">
      <img src="${invoiceImageUrl}" class="invoice-image" />
    </div>
  ` : ''

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
            margin: 10px;
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
          .footer {
            margin-top: 10px;
            font-size: 9px;
            width: 100%;
          }
          .footer-line1 {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
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
          .amount {
            text-align: right;
          }
          .total-row {
            font-weight: bold;
            background-color: #f5f5f5;
          }
          .page-break {
            page-break-before: always;
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
          .invoice-container h3 {
            margin-bottom: 10px;
            font-size: 12px;
          }
          .invoice-image {
            width: 100%;
            height: calc(100vh - 40px);
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        ${invoiceImageHTML}
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
              <td class="amount">₱${totalAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <div class="footer-line1">
            <div>Received by: _________________, Date: _________________</div>
            <div>GENERATED ON: ${generatedDateTime}</div>
          </div>
          <div class="footer-line2">
            <div>AIRLINE'S REPRESENTATIVE</div>
            <div>****************************************************SUBMITTED ALL ORIGINAL SIGNED PIR****************************************************</div>
          </div>
          <div class="footer-line3">
            Total PIR submitted: ${rowCounter - 1}
          </div>
        </div>
        ${formPages}
      </body>
    </html>
  `
}

export const printPDF = async (transactions, summary, invoiceImageUrl = null, printerUrl = null) => {
  try {
    if (!transactions || !summary) {
      throw new Error('Transactions and summary data are required')
    }

    const html = await generateTransactionReportHTML(
      transactions,
      summary,
      new Date().toLocaleDateString(),
      new Date().toLocaleTimeString(),
      invoiceImageUrl
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

export const sharePDF = async (transactions, summary, invoiceImageUrl = null) => {
  try {
    if (!transactions || !summary) {
      throw new Error('Transactions and summary data are required')
    }

    const html = await generateTransactionReportHTML(
      transactions,
      summary,
      new Date().toLocaleDateString(),
      new Date().toLocaleTimeString(),
      invoiceImageUrl
    )

    const { uri } = await Print.printToFileAsync({
      html,
      width: 612,
      height: 792,
      base64: false
    })

    if (!uri) {
      throw new Error('Failed to generate PDF: No URI returned')
    }

    const isAvailable = await Sharing.isAvailableAsync()
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device')
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Transaction Report',
      UTI: 'application/pdf'
    })
  } catch (error) {
    console.error('Error sharing PDF:', error)
    throw new Error(`Failed to share PDF: ${error.message}`)
  }
}