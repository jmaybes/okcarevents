"""
Emergent managed email integration.

Sends transactional emails (e.g. talent invites) through Emergent's managed
email proxy. No Resend account / API key is required — the per-app key is set in
the backend .env as EMERGENT_EMAIL_KEY. The sender display name comes from
EMAIL_FROM_NAME (the app's own brand).

Read email_guardrails in the integration playbook before editing: bodies must be
server-side templates, no <form>/<input>, links must be absolute https, and the
email must never ask the recipient for a password/OTP/card details.
"""
import os
import re
import ipaddress
import logging
import httpx
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Emergent managed email proxy. This is a CONSTANT — never read it from
# os.environ, so it survives deployment to the self-hosted VPS.
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "StreetMotion Official")
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str, reply_to: str | None = None) -> str | None:
    """Send one transactional email. Returns the provider email id or raises."""
    if not EMAIL_KEY:
        logger.warning("EMERGENT_EMAIL_KEY not set — skipping email send to %s", to)
        return None
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if reply_to or EMAIL_REPLY_TO:
        payload["contact_email"] = reply_to or EMAIL_REPLY_TO
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json=payload,
            )
        resp.raise_for_status()
        return resp.json().get("id")
    except httpx.HTTPStatusError as e:
        try:
            code = e.response.json().get("code", "")
        except ValueError:
            code = ""
        if code in ("insufficient_credits", "integration_disabled", "daily_limit_reached"):
            logger.warning("Email paused: %s (%s): %s", code, e.response.status_code,
                           e.response.json().get("message", ""))
        else:
            logger.error("Email send failed: %s %s", e.response.status_code, e.response.text)
        return None
    except Exception as e:
        logger.error("Email send error: %s", str(e))
        return None


def build_talent_invite_email(code: str) -> tuple[str, str]:
    """Server-side template for the talent invite email. Returns (subject, html).
    No links (the app is mobile-only), no forms, no credential asks."""
    brand = escape(EMAIL_FROM_NAME)
    safe_code = escape(code)
    subject = f"You're invited to join {EMAIL_FROM_NAME} as Talent"
    html = (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="background:#000;padding:24px"><tr><td align="center">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="max-width:480px;background:#111;border-radius:12px;border:1px solid #222">'
        '<tr><td style="padding:28px;font-family:Arial,Helvetica,sans-serif;color:#eee">'
        f'<h1 style="margin:0 0 12px;font-size:22px;color:#fff">You\'re invited to {brand}!</h1>'
        '<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:#cfcfcf">'
        'An admin has invited you to create a Talent listing so the community can '
        'discover and book you.</p>'
        '<p style="margin:0 0 8px;font-size:14px;color:#cfcfcf">Your invite code:</p>'
        '<div style="margin:0 0 20px;padding:16px;background:#000;border:1px solid #FF5500;'
        'border-radius:10px;text-align:center;font-size:24px;font-weight:bold;letter-spacing:3px;'
        f'color:#FFD700">{safe_code}</div>'
        '<p style="margin:0 0 8px;font-size:15px;color:#fff;font-weight:bold">How to set up your listing:</p>'
        '<ol style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:22px;color:#cfcfcf">'
        f'<li>Open the {brand} app</li>'
        '<li>Go to the <strong>Talent</strong> tab</li>'
        '<li>Tap the gold key icon at the top right</li>'
        f'<li>Enter your code: <strong>{safe_code}</strong></li>'
        '</ol>'
        '<p style="margin:0;font-size:12px;color:#888;line-height:18px">'
        f'Sent by {brand}. This invite code lets you set up your own listing in the app. '
        'We never ask for your password or payment details by email.</p>'
        '</td></tr></table></td></tr></table>'
    )
    return subject, html
