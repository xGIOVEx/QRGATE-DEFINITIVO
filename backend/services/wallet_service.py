"""
Wallet Pass Generation Service for QRGate
Supports Google Wallet (JWT-based) and Apple Wallet (.pkpass)
Both require external credentials to be configured in admin settings.
"""
import json
import jwt as pyjwt
import time
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class GoogleWalletService:
    """Generate Google Wallet 'Add to Wallet' links using JWT approach."""
    
    @staticmethod
    def is_configured(settings: dict) -> bool:
        return bool(
            settings.get('google_wallet_issuer_id')
            and settings.get('google_wallet_service_account_email')
            and settings.get('google_wallet_private_key')
        )
    
    @staticmethod
    def generate_pass_url(
        settings: dict,
        order: dict,
        venue: dict,
        ticket: dict,
        qr_token: str
    ) -> str:
        """
        Generate a Google Wallet 'Add to Wallet' URL using JWT.
        Returns a URL that, when clicked, adds the pass to the user's Google Wallet.
        """
        issuer_id = settings['google_wallet_issuer_id']
        sa_email = settings['google_wallet_service_account_email']
        private_key = settings['google_wallet_private_key']
        
        class_id = f"{issuer_id}.qrgate-{venue.get('slug', 'venue')}"
        object_id = f"{issuer_id}.order-{order['id']}"
        
        # Build the event ticket object
        ticket_object = {
            "id": object_id,
            "classId": class_id,
            "state": "ACTIVE",
            "heroImage": {
                "sourceUri": {
                    "uri": venue.get('cover_url', '')
                }
            } if venue.get('cover_url') else {},
            "textModulesData": [
                {
                    "header": "Luogo",
                    "body": venue.get('name', '')
                },
                {
                    "header": "Biglietto",
                    "body": ticket.get('name', '')
                },
                {
                    "header": "Quantita",
                    "body": str(order.get('quantity', 1))
                }
            ],
            "barcode": {
                "type": "QR_CODE",
                "value": qr_token
            },
            "eventName": {
                "defaultValue": {
                    "language": "it",
                    "value": venue.get('name', 'QRGate Ticket')
                }
            },
            "venue": {
                "name": {
                    "defaultValue": {
                        "language": "it",
                        "value": venue.get('name', '')
                    }
                },
                "address": {
                    "defaultValue": {
                        "language": "it",
                        "value": venue.get('address', '')
                    }
                }
            }
        }
        
        # Add timed entry slot if present
        if order.get('slot_time') and order.get('slot_date'):
            ticket_object["dateTime"] = {
                "start": f"{order['slot_date']}T{order['slot_time']}:00"
            }
            ticket_object["textModulesData"].append({
                "header": "Fascia oraria",
                "body": f"{order['slot_date']} - {order['slot_time']}"
            })
        
        # Build the event ticket class (will be auto-created if not exists)
        ticket_class = {
            "id": class_id,
            "issuerName": "QRGate",
            "eventId": class_id,
            "eventName": {
                "defaultValue": {
                    "language": "it",
                    "value": venue.get('name', 'Visita')
                }
            },
            "reviewStatus": "UNDER_REVIEW"
        }
        
        # Build JWT payload
        claims = {
            "iss": sa_email,
            "aud": "google",
            "origins": [],
            "typ": "savetowallet",
            "payload": {
                "eventTicketClasses": [ticket_class],
                "eventTicketObjects": [ticket_object]
            }
        }
        
        # Sign JWT
        token = pyjwt.encode(
            claims,
            private_key,
            algorithm="RS256"
        )
        
        return f"https://pay.google.com/gp/v/save/{token}"


class AppleWalletService:
    """
    Apple Wallet pass generation.
    Requires Apple Developer certificate (.pem), key (.pem), and WWDR certificate.
    """
    
    @staticmethod
    def is_configured(settings: dict) -> bool:
        return bool(
            settings.get('apple_wallet_certificate')
            and settings.get('apple_wallet_key')
            and settings.get('apple_wallet_pass_type_id')
            and settings.get('apple_wallet_team_id')
        )
    
    @staticmethod
    def generate_pass_data(
        settings: dict,
        order: dict,
        venue: dict,
        ticket: dict,
        qr_token: str
    ) -> dict:
        """
        Returns pass.json structure for Apple Wallet.
        Actual .pkpass signing requires the Apple certificates.
        """
        pass_data = {
            "formatVersion": 1,
            "passTypeIdentifier": settings['apple_wallet_pass_type_id'],
            "serialNumber": order['id'],
            "teamIdentifier": settings['apple_wallet_team_id'],
            "organizationName": "QRGate",
            "description": f"Biglietto - {venue.get('name', '')}",
            "foregroundColor": "rgb(255, 255, 255)",
            "backgroundColor": "rgb(45, 45, 45)",
            "labelColor": "rgb(200, 200, 200)",
            "barcode": {
                "message": qr_token,
                "format": "PKBarcodeFormatQR",
                "messageEncoding": "iso-8859-1"
            },
            "eventTicket": {
                "primaryFields": [
                    {
                        "key": "venue",
                        "label": "LUOGO",
                        "value": venue.get('name', '')
                    }
                ],
                "secondaryFields": [
                    {
                        "key": "ticket",
                        "label": "BIGLIETTO",
                        "value": ticket.get('name', '')
                    },
                    {
                        "key": "qty",
                        "label": "QTA",
                        "value": str(order.get('quantity', 1))
                    }
                ],
                "auxiliaryFields": [],
                "backFields": [
                    {
                        "key": "order_id",
                        "label": "ID Ordine",
                        "value": order['id']
                    }
                ]
            }
        }
        
        if order.get('slot_time') and order.get('slot_date'):
            pass_data["eventTicket"]["auxiliaryFields"].append({
                "key": "slot",
                "label": "FASCIA ORARIA",
                "value": f"{order['slot_date']} - {order['slot_time']}"
            })
        
        if venue.get('address'):
            pass_data["eventTicket"]["auxiliaryFields"].append({
                "key": "address",
                "label": "INDIRIZZO",
                "value": venue['address']
            })
        
        return pass_data
