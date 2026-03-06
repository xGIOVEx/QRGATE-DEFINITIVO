import stripe
import os
from typing import Dict, Any
import logging

# Configure Stripe
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', 'sk_test_placeholder')

logger = logging.getLogger(__name__)

class StripeService:
    """Handle all Stripe operations for QRGate SaaS"""
    
    @staticmethod
    def create_connect_account(email: str, country: str = "IT") -> Dict[str, Any]:
        """
        Create Stripe Connect Express account for venue
        Venues onboard via Stripe's hosted flow
        """
        try:
            account = stripe.Account.create(
                type="express",
                email=email,
                country=country,
                capabilities={
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True},
                },
            )
            return {
                "account_id": account.id,
                "onboarding_required": True
            }
        except stripe.error.StripeError as e:
            logger.error(f"Stripe Connect creation failed: {str(e)}")
            raise Exception(f"Failed to create Stripe account: {str(e)}")
    
    @staticmethod
    def create_account_link(account_id: str, refresh_url: str, return_url: str) -> str:
        """
        Create Stripe Connect onboarding link
        User completes identity verification and bank account setup
        """
        try:
            account_link = stripe.AccountLink.create(
                account=account_id,
                refresh_url=refresh_url,
                return_url=return_url,
                type="account_onboarding",
            )
            return account_link.url
        except stripe.error.StripeError as e:
            logger.error(f"Account link creation failed: {str(e)}")
            raise Exception(f"Failed to create onboarding link: {str(e)}")
    
    @staticmethod
    def get_account_status(account_id: str) -> Dict[str, Any]:
        """
        Check if venue has completed Stripe onboarding
        """
        try:
            account = stripe.Account.retrieve(account_id)
            return {
                "charges_enabled": account.charges_enabled,
                "payouts_enabled": account.payouts_enabled,
                "details_submitted": account.details_submitted,
                "requirements": account.requirements.to_dict() if hasattr(account, 'requirements') else {}
            }
        except stripe.error.StripeError as e:
            logger.error(f"Account status check failed: {str(e)}")
            return {"charges_enabled": False, "error": str(e)}
    
    @staticmethod
    def create_payment_intent(
        amount: int,  # total amount in cents
        fee_amount: int,  # QRGate fee in cents
        destination_account: str,  # venue stripe_account_id
        metadata: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """
        Create payment intent with automatic fee split
        
        Flow:
        1. Visitor pays total (ticket + fee + donation)
        2. Stripe automatically splits:
           - Venue receives: ticket amount (minus Stripe processing ~2.9% + 0.25€)
           - QRGate receives: application_fee_amount (our fee)
        3. Both parties receive payouts separately
        """
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency="eur",
                application_fee_amount=fee_amount,
                transfer_data={
                    "destination": destination_account,
                },
                metadata=metadata or {},
                automatic_payment_methods={
                    "enabled": True,
                },
            )
            return {
                "id": intent.id,
                "client_secret": intent.client_secret,
                "status": intent.status
            }
        except stripe.error.StripeError as e:
            logger.error(f"Payment intent creation failed: {str(e)}")
            raise Exception(f"Payment failed: {str(e)}")

    @staticmethod
    def create_checkout_session(
        amount: int,
        fee_amount: int,
        destination_account: str,
        success_url: str,
        cancel_url: str,
        metadata: Dict[str, str] = None,
        customer_email: str = None,
        line_item_name: str = "Ticket"
    ) -> Dict[str, Any]:
        """
        Create a Stripe Checkout Session for hosted payment.
        Fees are automatically routed.
        """
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'eur',
                        'product_data': {
                            'name': line_item_name,
                        },
                        'unit_amount': amount,
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=success_url,
                cancel_url=cancel_url,
                customer_email=customer_email,
                payment_intent_data={
                    "application_fee_amount": fee_amount,
                    "transfer_data": {"destination": destination_account},
                    "metadata": metadata or {}
                },
                metadata=metadata or {},
            )
            return {
                "id": session.id,
                "url": session.url
            }
        except stripe.error.StripeError as e:
            logger.error(f"Checkout session creation failed: {str(e)}")
            raise Exception(f"Checkout failed: {str(e)}")
    
    @staticmethod
    def create_refund(payment_intent_id: str, amount: int = None) -> Dict[str, Any]:
        """
        Refund a payment
        Automatically refunds both venue and QRGate fee portions
        """
        try:
            refund = stripe.Refund.create(
                payment_intent=payment_intent_id,
                amount=amount,  # None = full refund
            )
            return {
                "id": refund.id,
                "status": refund.status,
                "amount": refund.amount
            }
        except stripe.error.StripeError as e:
            logger.error(f"Refund failed: {str(e)}")
            raise Exception(f"Refund failed: {str(e)}")
    
    @staticmethod
    def verify_webhook_signature(payload: bytes, sig_header: str, webhook_secret: str) -> Dict[str, Any]:
        """
        Verify Stripe webhook signature
        Critical security - prevents fake webhooks
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
            return event
        except ValueError:
            raise Exception("Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise Exception("Invalid signature")

# Usage example for fee calculation:
# ticket_price = 800 cents (€8.00)
# qrgate_fee = 49 + round(ticket_price * 0.05) = 49 + 40 = 89 cents (€0.89)
# visitor_pays = ticket_price + qrgate_fee = 889 cents (€8.89)
#
# Stripe automatically sends:
# - To venue: ticket_price minus Stripe processing fee (~2.9% + €0.25)
# - To QRGate platform: qrgate_fee (application_fee_amount)