import { GoogleGenAI } from "@google/genai"
import { GEMINI_API_KEY } from '@env'
// Initialize the Gemini API with your API key
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

export const analyzeDeliveryStats = async (stats) => {
  try {
    const prompt = `Analyze the following delivery statistics and provide insights:
    Total Deliveries: ${stats.totalDeliveries}
    Successful Deliveries: ${stats.successfulDeliveries}
    Failed Deliveries: ${stats.failedDeliveries}
    Success Rate: ${(stats.successRate * 100).toFixed(1)}%
    Total Revenue: ₱${stats.totalRevenue.toLocaleString()}
    Average Delivery Time: ${stats.averageDeliveryTime} minutes
    Deliveries by Region: ${JSON.stringify(stats.deliveriesByRegion)}
    For context, there are 3 actors in the system: delivery personnel (employees), administrator (supervisors), airlines (clients).
    The airlines are the ones that make the booking and EGC-GHE delivers the assigned luggage.
    Please provide:
    1. A brief summary of overall performance
    2. Key strengths and areas for improvement
    3. Specific recommendations for optimization
    4. Regional performance insights
    Keep the response concise, readable, and actionable.
    Avoid using ** or *, use proper formatting.`

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    })

    return response.text
  } catch (error) {
    console.error('Error analyzing statistics with Gemini:', error)
    return null
  }
}