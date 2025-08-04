import React from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { Text, useTheme, Surface, Divider } from 'react-native-paper'
import Header from '../../customComponents/Header'

const TermsAndConditions = ({ navigation }) => {
  const { colors, fonts } = useTheme()

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]}>
      <Header navigation={navigation} title="Terms and Conditions" />
      <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={1}>

        <Text style={[styles.sectionTitle, { color: colors.onSurface, ...fonts.titleLarge }]} selectable>
          Service Delivery
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          1. The service all delivery is subject to acceptance by us by issuing a receipt confirming that the service delivery has been accepted. Our office, in respect of a particular baggage delivery request will only be formed when we issue you the confirmation thru email or text message.
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          2. Our company reserves the right, at our sole discretion, to reject delivery of your baggage for any reason whatsoever, including without the limitation, where the pick-up point and/or delivery point fall within an area which we do not provide the services.
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          3. We will not oblige to supply any other services in respect of baggage delivery until the provisions of such services have been confirmed in a separate confirmation.
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          4. Our services shall be limited to the collection/pick-up, transportation and delivery of the baggage referred to in the confirmation receipt. This service may include additional services as ordered request by the client and supplied by us i.e cling film wrapping etc.
        </Text>

        <Divider style={styles.divider} />

        <Text style={[styles.sectionTitle, { color: colors.onSurface, ...fonts.titleLarge }]} selectable>
          Amendments of Pick-up and Delivery Policy
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          1. You may amend or cancel 60 minutes before the pick-up time specified in the confirmation receipt.
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          2. Staff- Our services are performed and delivered by our staff/employee under employment. Some of our services could be sub-contracted by us to such courier as we nominate or contracted from time to time.
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          3. Baggage- The baggage must not exceed the number of cases per client, weight, dimensions specified on baggage limitation. Any baggage that exceeds the maximum number per client is subject for additional cost. Our company will not be liable for damage of any baggage labeled as "fragile" as our company is not the first handler or receiver of the baggage.
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          4. Our company shall not be liable for loss, damage, delay, arising from Act of God, force majeure, Acts of Government Authority or shippers breach of contract.
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          5. Our liability for loss damage, or delay shall be as follows:
        </Text>
        <Text style={[styles.subText, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          a. For lost, damaged baggage liability shall only be limited to refund of the delivery fee
        </Text>
        <Text style={[styles.subText, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          b. For delay in the delivery liability shall only be limited to refund or amount of delivery fee.
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          6. Our company will transport the baggage from the pick-up point/ collection point to the delivery point. The pick-up and delivery point can be an airport, Hotel, or Home address.
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          7. No pick-up and delivery will be accepted if the pick-up point and delivery point is inter Island, port, train station or an area in which we do not provide services.
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          8. The client must ensure that the baggage is available for pick-up to the delivery point at the time frame specified in the confirmation receipt.
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          9. Our company will deliver the baggage from the pick-up point to the delivery point by the delivery time and delivery date specified in the confirmation.
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          10. We will only be release the baggage to the person/company we reasonably believe to be the addressee specified in the confirmation receipt or to any other person to have written authority on behalf of the client (such person at the same premises as the client, hotel lobby or concierge as such please specify the name of the person the room of the hotel is booked under.
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          11. A surcharge, any cost we or the subcontractor may incur in storing, forwarding, disposing of, or returning the bag or any changes if any for making a second or further delivery attempt, returning the baggage to you and/or for the agreed appropriate action.
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          12. If we are unable to deliver the baggage because of an incorrect address we will make reasonable efforts to find correct delivery point. We will notify you of the correction and we will deliver or attempt the baggage to the correct delivery point.
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          13. Neither we nor the subcontractor accept any responsibility in any cases /circumstances for the suspension of carriage, redirected delivery whether to a different address from that stated in the confirmation receipt, return of the bag to you and, in the event that the delivery team should attempt but fail to do so, neither we or the subcontractor shall have any liability for losses occasioned thereby.
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          14. We will provide you a confirmation receipt and delivery receipt of every baggage delivered thru your official email.
        </Text>
        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyLarge }]} selectable>
          15. Billing is every 30th day of each month.
        </Text>
      </Surface>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  surface: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionTitle: {
    marginBottom: 16,
  },
  text: {
    lineHeight: 28,
    marginBottom: 16,
  },
  subText: {
    lineHeight: 28,
    marginBottom: 16,
    marginLeft: 24,
  },
  divider: {
    marginVertical: 24,
  },
})

export default TermsAndConditions 