#!/usr/bin/env python3
"""Generate a polished client-facing setup guide PDF for the Zega Digital bot."""

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    Preformatted, KeepTogether, HRFlowable,
)

OUT = "Zega Digital - Client Setup Guide.pdf"

BRAND = HexColor("#0F6E56")      # deep teal
BRAND_MID = HexColor("#1D9E75")
LIGHT = HexColor("#E1F5EE")      # teal tint
INK = HexColor("#1A2A26")
MUTED = HexColor("#5F6B66")
RULE = HexColor("#CFE3DA")
CODE_BG = HexColor("#F1F4F3")
WARN_BG = HexColor("#FBF1E7")
WARN_BD = HexColor("#E0A66A")

styles = getSampleStyleSheet()
body = ParagraphStyle("body", parent=styles["Normal"], fontName="Helvetica",
                      fontSize=10.5, leading=15.5, textColor=INK, spaceAfter=6)
muted = ParagraphStyle("muted", parent=body, textColor=MUTED, fontSize=9.5, leading=14)
h2 = ParagraphStyle("h2", parent=body, fontName="Helvetica-Bold", fontSize=13,
                    textColor=BRAND, spaceBefore=4, spaceAfter=2, leading=16)
note = ParagraphStyle("note", parent=body, fontSize=9.8, leading=14.5, textColor=HexColor("#0B4034"))
warn = ParagraphStyle("warn", parent=body, fontSize=9.8, leading=14.5, textColor=HexColor("#6B3D12"))
title = ParagraphStyle("title", parent=body, fontName="Helvetica-Bold", fontSize=26,
                       textColor=BRAND, leading=30)
sub = ParagraphStyle("sub", parent=body, fontSize=12.5, textColor=MUTED, leading=17)

CONTENT_W = LETTER[0] - 1.7 * inch


def tag(label, who):
    color = BRAND_MID if who == "You" else MUTED
    return f'  <font size=8 color="#FFFFFF" backColor="{color.hexval()[2:] and "#" + color.hexval()[2:]}"> {label} </font>'


def heading(text, who):
    who_color = "#1D9E75" if who == "You" else "#8A938F"
    pill = (f'<font size=8 color="#FFFFFF" backColor="{who_color}"> {who.upper()} </font>')
    return Paragraph(f"{text}&nbsp;&nbsp;{pill}", h2)


def check(text):
    """A checklist row: an empty box + text."""
    box = Table([[""]], colWidths=[10], rowHeights=[10])
    box.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.9, BRAND_MID),
        ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    row = Table([[box, Paragraph(text, body)]], colWidths=[20, CONTENT_W - 20])
    row.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (0, 0), 3), ("TOPPADDING", (1, 0), (1, 0), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (0, 0), 0), ("LEFTPADDING", (1, 0), (1, 0), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return row


def callout(para, bg, bd):
    t = Table([[para]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LINEABOVE", (0, 0), (-1, -1), 2, bd), ("LINEBELOW", (0, 0), (-1, -1), 0.4, bd),
        ("LINELEFT", (0, 0), (-1, -1), 2, bd), ("LINERIGHT", (0, 0), (-1, -1), 0.4, bd),
        ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ]))
    return t


def codeblock(text):
    p = Preformatted(text, ParagraphStyle("code", fontName="Courier", fontSize=9,
                                          leading=13, textColor=INK))
    t = Table([[p]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CODE_BG),
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
        ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ]))
    return t


def rule():
    return HRFlowable(width="100%", thickness=0.6, color=RULE, spaceBefore=10, spaceAfter=10)


def step(n, ttl, who, blocks):
    out = [heading(f"Step {n} — {ttl}", who)]
    out.extend(blocks)
    return [KeepTogether(out)] if n in (2, 4, 5, 6, 7) else out


story = []

# ---- Title block ----
story.append(Spacer(1, 6))
story.append(Paragraph("Zega Digital — WhatsApp Bot", title))
story.append(Spacer(1, 2))
story.append(Paragraph("Client Setup Guide", sub))
story.append(Spacer(1, 10))
story.append(HRFlowable(width="100%", thickness=2, color=BRAND, spaceAfter=12))

story.append(Paragraph(
    "This guide lists everything <b>you (the client)</b> need to prepare on your side so your "
    "developer can connect and launch the Zega Digital WhatsApp bot. You already have the hard "
    "part done — a <b>Meta Business account with the WhatsApp API configured</b>. The remaining "
    "tasks are mostly collecting a few credentials, creating a <b>permanent access token</b>, and "
    "approving a couple of settings. None of this requires coding.", body))

story.append(callout(Paragraph(
    "<b>Roles:</b> Tasks marked <b>[You]</b> are done by you in your Meta / Business account. "
    "Tasks marked <b>[Developer]</b> are done by your developer — listed only so you know what to "
    "expect. When you finish, hand your developer the checklist in Step 10.<br/><br/>"
    "Set aside about <b>30–45 minutes</b>, and have a password manager or secure note ready to "
    "store the values you collect.", note), LIGHT, BRAND_MID))
story.append(Spacer(1, 4))
story.append(rule())

# ---- Steps ----
story += step(1, "Collect your WhatsApp API details", "You", [
    Paragraph("Go to <b>developers.facebook.com › My Apps › <i>(your app)</i> › WhatsApp › API "
              "Setup</b>. Copy these two values:", body),
    check("<b>Phone Number ID</b> — a long number shown under the sender number"),
    check("<b>WhatsApp Business Account ID</b> (WABA ID)"),
    Paragraph("These identify which number the bot speaks through. They are not secret, but your "
              "developer needs them.", muted),
])
story.append(rule())

story += step(2, "Get your App ID and App Secret", "You", [
    Paragraph("Go to <b>your app › App Settings › Basic</b>.", body),
    check("<b>App ID</b>"),
    check("<b>App Secret</b> (click <i>Show</i> — treat this like a password)"),
    Paragraph("The App Secret lets the bot verify that incoming messages really come from Meta. "
              "Keep it private.", muted),
])
story.append(rule())

story += step(3, "Create a PERMANENT access token", "You", [
    Paragraph("<b>This is the most important step.</b> The token shown on the API Setup page "
              "<b>expires after 24 hours</b>. A live bot needs a token that never expires, created "
              "through a <i>System User</i>.", body),
    Paragraph("1.&nbsp; Go to <b>business.facebook.com › Business Settings</b>.<br/>"
              "2.&nbsp; Under <i>Users</i>, click <b>System Users</b>.<br/>"
              "3.&nbsp; Click <b>Add</b>, name it e.g. <i>Zega Bot</i>, role <b>Admin</b>, create it.<br/>"
              "4.&nbsp; Click <b>Add Assets</b> › select your <b>App</b> and your <b>WhatsApp "
              "Account</b> › enable full control for each.<br/>"
              "5.&nbsp; Click <b>Generate New Token</b> › choose your app › expiration <b>Never</b>.<br/>"
              "6.&nbsp; Tick <b>whatsapp_business_messaging</b> and <b>whatsapp_business_management</b>, "
              "then <b>Generate</b>.<br/>"
              "7.&nbsp; <b>Copy the token immediately and store it securely</b> — Meta shows it only once.", body),
    check("Permanent access token generated and saved"),
])
story.append(rule())

story += step(4, "Make sure billing is set up", "You", [
    Paragraph("WhatsApp charges per conversation, billed to your business account. In "
              "<b>WhatsApp Manager › Billing / Payment settings</b>, confirm a valid payment method "
              "is attached.", body),
    check("Payment method confirmed"),
])
story.append(rule())

story += step(5, "Confirm your phone number is ready", "You", [
    Paragraph("In <b>WhatsApp › API Setup</b> (or WhatsApp Manager › Phone numbers):", body),
    check("The number for the bot is listed and its <b>display name is approved</b> (status "
          "<i>Connected</i> / green tick)"),
    check("While testing, add your <b>testers' phone numbers</b> under the recipient list — during "
          "testing the bot can only message numbers added there"),
])
story.append(rule())

story += step(6, "Business verification (for full public launch)", "You", [
    Paragraph("You can skip this while testing. To message the general public at scale you need a "
              "<b>verified business</b>. Go to <b>Business Settings › Security Center</b> and "
              "complete verification.", body),
    check("Business verification complete (or planned before public launch)"),
])
story.append(rule())

story += step(7, "Provide a privacy policy URL", "You", [
    Paragraph("Meta requires a privacy policy for live messaging apps. A simple page stating that "
              "the bot provides digital-literacy education and does not store personal conversations "
              "is enough.", body),
    check("Privacy policy URL ready (e.g. on your website)"),
])
story.append(rule())

story += step(8, "Approve the reminder templates (optional)", "You + Developer", [
    Paragraph("Only needed if you want the bot to <b>send daily reminders</b> to inactive users — "
              "the core lessons work without this. Your developer submits 3 message templates; you "
              "may need to review them in <b>WhatsApp Manager › Message templates</b>. Approval "
              "takes a few hours to a day.", body),
    check("(Optional) Reminder templates reviewed / approved"),
])
story.append(rule())

story += step(9, "Decide a few things", "You", [
    Paragraph("Quick decisions your developer will ask about:", body),
    check("<b>Which phone number</b> the bot runs on (test number vs. your real number)"),
    check("<b>Languages</b> to launch with (English is ready; Amharic / Afaan Oromo can be added)"),
    check("<b>Reminders</b> on or off at launch"),
    check("<b>Who pays for hosting</b> (a small monthly fee, roughly $0–10) and approval to set it up"),
])
story.append(rule())

story += step(10, "Hand off to your developer", "You", [
    Paragraph("Send the following to your developer <b>securely</b> — use a password-manager share "
              "or an encrypted note, <b>not</b> plain email or chat:", body),
    codeblock(
        "Phone Number ID:             ____________________\n"
        "WhatsApp Business Acct ID:   ____________________\n"
        "App ID:                      ____________________\n"
        "App Secret:                  ____________________   (secret)\n"
        "Permanent access token:      ____________________   (secret)\n"
        "Verify token:                (developer can choose, or pick a random phrase)\n"
        "Privacy policy URL:          ____________________\n"
        "Phone number / display name: ____________________"),
    Spacer(1, 4),
    callout(Paragraph(
        "<b>Security note:</b> the App Secret and permanent token give full control of your WhatsApp "
        "messaging. Share them only with your trusted developer, store them in a password manager, "
        "and regenerate them if they ever leak.", warn), WARN_BG, WARN_BD),
])
story.append(rule())

story.append(heading("What happens next", "Developer"))
story.append(Paragraph(
    "Your developer will: (1) deploy the bot to a hosting service that provides a public web "
    "address; (2) enter your credentials there as configuration; (3) update your <b>Webhook</b> in "
    "the Meta dashboard to point at that address and subscribe to the <font face='Courier'>messages</font> "
    "field; (4) test by messaging your number, then hand it over. Once that is done, anyone messaging "
    "your WhatsApp number gets the bot.", body))


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.5)
    canvas.line(0.85 * inch, 0.7 * inch, LETTER[0] - 0.85 * inch, 0.7 * inch)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(0.85 * inch, 0.55 * inch, "Zega Digital — Client Setup Guide")
    canvas.drawRightString(LETTER[0] - 0.85 * inch, 0.55 * inch, "Page %d" % doc.page)
    canvas.restoreState()


doc = BaseDocTemplate(OUT, pagesize=LETTER, topMargin=0.8 * inch, bottomMargin=0.95 * inch,
                      leftMargin=0.85 * inch, rightMargin=0.85 * inch,
                      title="Zega Digital - Client Setup Guide", author="Zega Digital")
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=footer)])
doc.build(story)
print("Wrote", OUT)
