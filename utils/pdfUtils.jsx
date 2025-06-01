import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'

const generateTransactionReportHTML = (transactions, summary, date, time) => {
  // Get the first and last day of the current month
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  
  // Format dates with 3-letter month
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }
  
  const dateRange = `${formatDate(firstDay)} TO ${formatDate(lastDay)}`
  const generatedDateTime = `${date} ${time}`

  // Calculate total amount
  const totalAmount = transactions.reduce((sum, transaction) => sum + (transaction.total_amount || 0), 0)

  // Format transactions for the table
  const formattedTransactions = transactions.map((transaction, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${transaction.id}</td>
      <td>${transaction.airline_name}</td>
      <td>${transaction.flight_number || 'N/A'}</td>
      <td>${transaction.drop_off_location}</td>
      <td>${transaction.created_at}</td>
      <td>${transaction.status}</td>
      <td class="amount">₱${transaction.total_amount.toFixed(2)}</td>
      <td>${transaction.remarks || ''}</td>
    </tr>
  `).join('')

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
            font-size: 9px;
          }
          th, td { 
            border: 1px solid #000; 
            padding: 3px; 
            text-align: left;
          }
          th { 
            background-color: #f5f5f5;
            font-weight: bold;
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
        </style>
      </head>
      <body>
        <div class="header">
          GHE TRANSMITTAL - AIRPORT CLIENTS PROPERTY IRREGULARITY SUMMARY REPORT<br>
          ${dateRange}
        </div>
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Tracking ID</th>
              <th>NAME</th>
              <th>FLIGHT No.</th>
              <th>ADDRESS</th>
              <th>DATE RECEIVED</th>
              <th>STATUS</th>
              <th>AMOUNT</th>
              <th>REMARKS</th>
            </tr>
          </thead>
          <tbody>
            ${formattedTransactions}
            <tr class="total-row">
              <td colspan="7">TOTAL</td>
              <td class="amount">₱${totalAmount.toFixed(2)}</td>
              <td></td>
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
            <div>*************SUBMITTED ALL ORIGINAL SIGNED PIR*****</div>
          </div>
          <div class="footer-line3">
            Total PIR submitted: ${transactions.length}
          </div>
        </div>
      </body>
    </html>
  `
}

export const printPDF = async (transactions, summary, printerUrl = null) => {
  try {
    if (!transactions || !summary) {
      throw new Error('Transactions and summary data are required')
    }

    const html = generateTransactionReportHTML(
      transactions,
      summary,
      new Date().toLocaleDateString(),
      new Date().toLocaleTimeString()
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

export const sharePDF = async (transactions, summary) => {
  try {
    if (!transactions || !summary) {
      throw new Error('Transactions and summary data are required')
    }

    const html = generateTransactionReportHTML(
      transactions,
      summary,
      new Date().toLocaleDateString(),
      new Date().toLocaleTimeString()
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