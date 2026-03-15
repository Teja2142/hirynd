import resend
from django.conf import settings
from .models import EmailLog
import logging

logger = logging.getLogger(__name__)


def send_email(to, subject, html, email_type='transactional'):
    try:
        resend.api_key = settings.RESEND_API_KEY
        result = resend.Emails.send({
            'from': f'HYRIND <noreply@{settings.SITE_URL.replace("https://", "").replace("http://", "")}>',
            'to': [to],
            'subject': subject,
            'html': html,
        })
        EmailLog.objects.create(recipient_email=to, email_type=email_type, status='sent')
        return result
    except Exception as e:
        logger.error(f'Email send failed: {e}')
        EmailLog.objects.create(recipient_email=to, email_type=email_type, status='failed', error_message=str(e))
        return None
