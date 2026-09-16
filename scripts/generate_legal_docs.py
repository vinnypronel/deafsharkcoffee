from pathlib import Path
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "legal"
OUT.mkdir(exist_ok=True)

INK = RGBColor(45, 26, 18)
TEAL = RGBColor(13, 95, 92)
MUTED = RGBColor(108, 91, 81)
RED = RGBColor(158, 45, 45)
AMBER = RGBColor(168, 100, 28)


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def prevent_row_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    tr_pr.append(OxmlElement("w:cantSplit"))


def repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    header = OxmlElement("w:tblHeader")
    header.set(qn("w:val"), "true")
    tr_pr.append(header)


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("Page ")
    run.font.size = Pt(9)
    fld_char = OxmlElement("w:fldChar")
    fld_char.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = "PAGE"
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.extend([fld_char, instr, separate, end])


def add_hyperlink(paragraph, text, url):
    part = paragraph.part
    rel_id = part.relate_to(url, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink", is_external=True)
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), rel_id)
    run = OxmlElement("w:r")
    r_pr = OxmlElement("w:rPr")
    color = OxmlElement("w:color")
    color.set(qn("w:val"), "0D5F5C")
    underline = OxmlElement("w:u")
    underline.set(qn("w:val"), "single")
    r_pr.extend([color, underline])
    text_node = OxmlElement("w:t")
    text_node.text = text
    run.extend([r_pr, text_node])
    hyperlink.append(run)
    paragraph._p.append(hyperlink)


def base_document(title, subtitle):
    doc = Document()
    sec = doc.sections[0]
    sec.top_margin = Inches(0.72)
    sec.bottom_margin = Inches(0.68)
    sec.left_margin = Inches(0.78)
    sec.right_margin = Inches(0.78)

    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Aptos"
    normal.font.size = Pt(10)
    normal.font.color.rgb = INK
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.12
    for name, size, color in [("Title", 25, INK), ("Heading 1", 16, INK), ("Heading 2", 12, TEAL)]:
        st = styles[name]
        st.font.name = "Georgia" if name != "Heading 2" else "Aptos Display"
        st.font.size = Pt(size)
        st.font.color.rgb = color
        st.font.bold = name != "Title"
        st.paragraph_format.keep_with_next = True
        st.paragraph_format.space_before = Pt(12 if name == "Heading 1" else 8)
        st.paragraph_format.space_after = Pt(5)
        if name == "Title":
            p_pr = st.element.get_or_add_pPr()
            for border in p_pr.findall(qn("w:pBdr")):
                p_pr.remove(border)

    if "Risk Label" not in styles:
        risk = styles.add_style("Risk Label", WD_STYLE_TYPE.PARAGRAPH)
        risk.font.name = "Aptos"
        risk.font.size = Pt(9)
        risk.font.bold = True
        risk.font.color.rgb = RED
        risk.paragraph_format.space_after = Pt(2)

    header = sec.header.paragraphs[0]
    header.text = "DEAF SHARK COFFEE  |  LEGAL REVIEW"
    header.style = styles["Caption"]
    header.runs[0].font.color.rgb = INK
    header.runs[0].font.bold = True

    footer = sec.footer.paragraphs[0]
    footer.add_run("Draft for attorney review  |  ")
    add_page_number(footer)

    p = doc.add_paragraph(style="Title")
    p.add_run(title)
    sub = doc.add_paragraph()
    sub.paragraph_format.space_after = Pt(14)
    r = sub.add_run(subtitle)
    r.font.size = Pt(11)
    r.font.color.rgb = MUTED
    return doc


def add_notice(doc, text):
    table = doc.add_table(rows=1, cols=1)
    table.autofit = True
    set_cell_shading(table.cell(0, 0), "F6EDE3")
    p = table.cell(0, 0).paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run(text)
    r.bold = True
    r.font.color.rgb = AMBER
    doc.add_paragraph()


def add_sections(doc, sections):
    for heading, paragraphs in sections:
        doc.add_heading(heading, level=1)
        for item in paragraphs:
            if isinstance(item, tuple) and item[0] == "bullets":
                for bullet in item[1]:
                    paragraph = doc.add_paragraph(bullet, style="List Bullet")
                    paragraph.paragraph_format.keep_together = True
            else:
                paragraph = doc.add_paragraph(item)
                paragraph.paragraph_format.keep_together = True


PRIVACY_SECTIONS = [
    ("1 Who we are and what this policy covers", [
        "This Privacy Policy describes how Deaf Shark Coffee, LLC, doing business as Deaf Shark Coffee (Deaf Shark, we, us, or our), collects, uses, discloses, and retains personal information when you use deafsharkcoffee.com, create an account, place a pickup order, participate in rewards and promotional programs, contact us, subscribe to marketing, apply for work, or otherwise use our online services. It does not govern information processed independently by a third party under that party's own privacy policy."
    ]),
    ("2 Personal information we collect", [
        "The information we collect depends on the features you use and may include:",
        ("bullets", [
            "Account and identity information, including name, email address, phone number, account identifier, password credential maintained through our authentication system, profile image, the policy versions and time you accepted them, and your confirmation that you meet the account age requirement or have required guardian involvement.",
            "Google sign-in information, including the name, email address, profile information, and identifier Google makes available when you choose Google sign-in. We do not receive your Google password.",
            "Order information, including ordered items, selections, customizations, special instructions, prices, taxes, discounts, pickup selection and estimate, status, customer name and phone number, payment method category, and account order history.",
            "Rewards and eligibility information, including points and redemption history, birthday month and day, welcome and birthday benefits, referral activity, promotions, and a Kean University email address and verification date if you request the student discount.",
            "Communications and marketing choices, including contact-form messages, our correspondence, newsletter status, consent language, and the time and source of a marketing choice.",
            "Employment information, including contact details, availability, work-related responses, age-of-majority response, resume and file metadata, and application status.",
            "Device, network, and security information, including IP address, browser or device information, user agent, requested pages, timestamps, referring page, session and cookie identifiers, rate-limit records, and information used to detect fraud, spam, or security incidents."
        ]),
        "Please do not place sensitive medical information in an order note, contact message, or job application. Call the shop before ordering if you need to discuss a food allergy."
    ]),
    ("3 Payments", [
        "The payment choices shown at checkout are the choices currently available. Orders marked for payment at pickup are paid at the store. Online card payments are processed by Stripe. Card and other payment credentials are submitted directly to Stripe and governed by Stripe's privacy policy. We may receive limited details such as a transaction identifier, payment status, card brand and last four digits, refund status, and fraud signals, but we do not intend to receive or store a full payment-card number or card security code on our website servers."
    ]),
    ("4 How we collect and use information", [
        "We collect information directly from you, automatically when you use the website, from Google when you choose Google sign-in, from providers supporting the features you use, and from staff when they update an order, application, or rewards record. Website order information is managed in our website system and does not flow automatically into Genius POS.",
        ("bullets", [
            "Provide, secure, maintain, troubleshoot, and improve the website.",
            "Create and authenticate accounts and respond to account-security requests.",
            "Accept, prepare, fulfill, support, and maintain records of pickup orders.",
            "Administer rewards, referrals, birthday benefits, promotions, and student discounts.",
            "Send order-ready, verification, password-reset, and other service communications.",
            "Send marketing only in accordance with your choices and applicable law.",
            "Respond to messages, feedback, privacy requests, and customer-service concerns.",
            "Review employment applications and communicate with applicants.",
            "Detect and prevent fraud, spam, misuse, and security incidents.",
            "Comply with legal, tax, accounting, recordkeeping, and dispute-resolution needs."
        ])
    ]),
    ("5 Cookies and similar technologies", [
        "We use cookies, local storage, and similar technologies needed for sign-in, security, fraud prevention, cart and session functions, preferences, and basic website operation. Blocking necessary technologies may prevent parts of the website from working. We do not currently use advertising pixels or personal information for targeted advertising. Before introducing optional analytics or advertising technologies, we will update this policy and provide notice or choices required by applicable law."
    ]),
    ("6 When we disclose information", [
        "We do not sell personal information for money, rent customer lists, or disclose personal information for another company's independent direct marketing. We may disclose information to service providers supporting hosting, databases, file storage, security and bot prevention, authentication, email delivery, text messaging, payment processing, and professional services. Depending on the feature, these providers may include Cloudflare, Google, an email-delivery provider, Twilio, and Stripe.",
        "We may also disclose information when reasonably necessary to comply with law or a lawful request, protect customers or the business, investigate fraud or misuse, enforce agreements, obtain professional advice, or complete a merger, financing, sale, or transfer of business assets. Employment applications are not disclosed to unrelated parties for their own marketing."
    ]),
    ("7 Email and text messages", [
        "Account, order, verification, password-reset, and security messages are service communications. If you provide a mobile number for an order and agree to receive an order-ready text, we may send a transactional text when the order is ready. Message and data rates may apply. You may reply STOP or contact us to withdraw permission for future texts.",
        "Promotional email is optional and is not required to create an account or place an order. When promotional email becomes available, you may unsubscribe using the link in any marketing email or by contacting us. We may retain a minimal suppression record so that we can continue honoring an opt-out."
    ]),
    ("8 Retention", [
        "We retain each category of information only for as long as reasonably necessary for the purposes described here. The period depends on whether your account remains active, whether an order or request is still open, warranty and customer-service needs, fraud and security risks, tax and accounting requirements, employment-record rules, and potential disputes. Closing an account removes access to the account but does not require us to erase transaction, suppression, security, or other records that we are permitted or required to retain. When information is no longer needed, we delete, anonymize, or securely dispose of it. Backup copies are removed through the ordinary backup-rotation process."
    ]),
    ("9 Security and incident response", [
        "We use administrative, technical, and organizational safeguards designed for the nature of the information we maintain, including access controls, encrypted network connections, authentication, rate limiting, and security screening. No system can be guaranteed completely secure. If a security incident affects personal information, we will investigate and provide notices required by applicable law. Keep your credentials confidential and contact us promptly if you suspect unauthorized account activity."
    ]),
    ("10 Your choices and privacy requests", [
        "You may ask to access, correct, or delete personal information associated with you, obtain a copy of information you provided, or close your account by emailing help@deafsharkcoffee.com. Account settings provides authenticated download and account-closure options. We will verify requests to protect customer information. We may deny or limit a request where permitted or required for security, fraud prevention, legal compliance, recordkeeping, another person's privacy, or the establishment or defense of legal claims. If applicable law gives you additional rights or a right to appeal a decision, we will honor those requirements."
    ]),
    ("11 Children and teenagers", [
        "The website is a general-audience service and is not directed to children under 13. You may not create an account if you are under 13. Customers aged 13 through 17 may use an account only with the permission and involvement of a parent or legal guardian. If you believe a child under 13 provided personal information, contact us so we can investigate and take appropriate action."
    ]),
    ("12 Changes and contact", [
        "We may update this policy when our services, vendors, or legal obligations change. We will post the updated version with a revised effective date. We will provide additional notice or request consent before a materially different use where required by law.",
        "Email privacy questions or requests to help@deafsharkcoffee.com, call (908) 481-8884, use the website contact page, or write to Deaf Shark Coffee, 900 Green Lane, Union, NJ 07083."
    ])
]


TERMS_SECTIONS = [
    ("1 Agreement and business identity", [
        "These Terms of Service govern deafsharkcoffee.com and the online services provided by Deaf Shark Coffee, LLC, doing business as Deaf Shark Coffee (Deaf Shark, we, us, or our), at 900 Green Lane, Union, New Jersey 07083. By creating an account or placing an order, you agree to these Terms and acknowledge our Privacy Policy. Marketing consent is separate and optional."
    ]),
    ("2 Age requirements", [
        "You must be at least 13 to create an account. If you are 13 through 17, you may use an account and place an order only with the permission and involvement of a parent or legal guardian. The website is not directed to children under 13, and children under 13 may not create accounts or provide personal information through the website."
    ]),
    ("3 Accounts", [
        "Provide accurate information, maintain only one personal account, and keep your login credentials confidential. Accounts may not be sold, assigned, or used to obtain duplicate rewards. Notify us promptly at help@deafsharkcoffee.com if you suspect unauthorized access. You are responsible for activity you authorize, subject to rights that cannot be limited by law.",
        "You may request account closure through an available account setting or by contacting us. Closing an account ends access to its order history and forfeits all unused points and promotional benefits. Purchased gift-card funds remain separate. We may retain transaction, security, suppression, and other records as explained in the Privacy Policy and permitted or required by law."
    ]),
    ("4 Pickup orders and acceptance", [
        "Website orders are for pickup at 900 Green Lane, Union, New Jersey. We do not offer shipping or delivery through the website. The ordering options displayed at checkout are the options currently available. Guest checkout may be offered only when online payment is available; otherwise, an account is required.",
        "Submitting an order is an offer to purchase. We accept it when we display or send a valid order confirmation. We may reject or cancel an order because of an unavailable item, pricing or description error, suspected fraud, store closure, equipment problem, or inability to fulfill the order. Review all items, customizations, contact details, pickup selections, discounts, and totals before submitting."
    ]),
    ("5 Payment", [
        "We may require online payment for a guest order or an account's first order. A returning account may be offered payment at pickup. The actual payment choices shown at checkout control for that order. Website order information does not automatically transfer into Genius POS; staff process pay-at-pickup orders at the store.",
        "Online card payments are processed by Stripe, whose terms and privacy policy may also apply. You authorize the total shown when you submit a paid order. Deaf Shark does not intend to receive or store a complete card number or card security code. Any card surcharge will be clearly and conspicuously disclosed before payment and will not exceed our actual cost to process that credit-card payment or any lower legal limit."
    ]),
    ("6 Prices taxes substitutions and availability", [
        "Prices and availability may change for future orders. Applicable taxes, discounts, and fees are shown before submission. We will not increase the price of a confirmed order or substitute a more expensive item without your agreement. If an item is unavailable, we may contact you with an alternative or remove it and prepare the remainder. An amount paid for an item we do not provide will be refunded."
    ]),
    ("7 Pickup changes cancellations and no shows", [
        "Pickup times are estimates. Call (908) 481-8884 immediately if you need a change or cancellation. We cannot guarantee changes after preparation begins. If you paid online and cancel before preparation begins, we will provide a full refund. Once preparation begins, all sales are final. Food, beverages, merchandise, and other purchases cannot be returned or refunded because you changed your mind, preferred a different taste, arrived late, or did not collect the order. If we cancel a paid order, we will provide a full refund.",
        "Tell us promptly if an item is incorrect, missing, defective, or has a substantiated quality issue. We may choose to remake or replace an affected item, but do not promise a refund after preparation begins except where applicable law requires one. Any refund generally returns to the original payment method; bank processing times vary. Nothing here limits a remedy that applicable law requires."
    ]),
    ("8 Food allergies", [
        "Our kitchen and bar handle dairy, tree nuts, peanuts, wheat and gluten, soy, eggs, and sesame. Shared equipment and preparation areas create a risk of cross-contact. We can discuss ingredient requests but cannot guarantee that an item is completely free of an allergen. For a food allergy, call the shop before ordering and speak with a team member; do not rely only on an online note."
    ]),
    ("9 Rewards discounts and promotions", [
        "Rewards are free promotional benefits for eligible account holders. Current earning and redemption rules are displayed with the program or offer. Points are earned only on qualifying completed purchases, have no cash value, and are not gift cards. They cannot be purchased, transferred, or sold. We may correct errors and remove benefits obtained through fraud, duplicate accounts, returns, or misuse.",
        "Each award of points expires 12 months after the date it is earned. Redemptions use the oldest unexpired points first. Closing an account forfeits all unused points. Rewards, points, student discounts, and promotional offers cannot be combined unless the terms displayed with a particular promotion expressly allow combining them.",
        "The verified Kean student discount is currently 10% on eligible orders. Birthday, welcome, referral, and other promotional benefits are subject to the limits displayed with each offer. The birthday benefit currently applies to one eligible drink up to $8, in store on the birthday shown in the account, and begins the following year if the birthday is first added on that date.",
        "We may change future earning rates and offers after notice. The stated 12-month expiration applies to every award. If we otherwise materially reduce the redemption value of already-earned points or discontinue rewards, we will provide reasonable notice where practicable, unless fraud, misuse, law, or circumstances outside our reasonable control require different action."
    ]),
    ("10 Gift cards and all sales final policy", [
        "Gift cards are currently sold only as physical cards at the store, not through this website. Purchased gift-card funds are separate from rewards. Gift-card funds do not expire, and we do not charge dormancy or inactivity fees. A remaining balance of $5 or less may be redeemed for cash where New Jersey law applies. Gift cards are not refundable except where required by law.",
        "All merchandise sales are final. Merchandise cannot be returned or exchanged for a change of mind. This policy does not eliminate remedies that cannot legally be waived, including remedies for an incorrect or defective item where applicable law requires them."
    ]),
    ("11 Communications", [
        "We may contact you about an order, account security, verification, password reset, rewards administration, or material service change. Providing a mobile number does not give blanket consent to marketing texts. If you agree to order-ready texts, message and data rates may apply and you may reply STOP or contact us to withdraw permission.",
        "Promotional email or text requires a separate choice where required. Marketing is not required to create an account or buy anything. You may use an unsubscribe link, reply STOP to marketing texts, or contact us to opt out."
    ]),
    ("12 Guest Wi Fi", [
        "Guest Wi-Fi is offered as a courtesy during business hours and may be limited or discontinued. Availability, performance, and security are not guaranteed. Use encrypted services and appropriate device protections. Do not use the network unlawfully, interfere with other users, bypass security, or access another person's device or information without permission."
    ]),
    ("13 Acceptable use and ownership", [
        "Do not submit fraudulent orders, abuse rewards, create accounts through automation, scrape personal information, introduce malicious code, interfere with the website, or attempt to access another customer's account or data. Ordinary use of accessibility technology is permitted. Website text, designs, photographs, graphics, and logos are owned by Deaf Shark or used with permission and may not be commercially exploited without authorization."
    ]),
    ("14 Website availability and liability", [
        "The website is provided on an as available basis. To the extent permitted by law, we do not guarantee uninterrupted or error-free access or that every menu description, price, hour, photograph, or availability statement is current at every moment. This does not excuse inaccurate or misleading statements or limit warranties and consumer protections that cannot legally be waived.",
        "To the extent permitted by law, Deaf Shark is not liable for indirect, incidental, special, or consequential damages arising from the website, accounts, ordering system, rewards, or guest Wi-Fi. This exclusion does not apply to personal injury or death, fraud, gross negligence, willful misconduct, violations of the New Jersey Consumer Fraud Act or Products Liability Act, required refunds, or liability that cannot legally be excluded."
    ]),
    ("15 Suspension and closure", [
        "We may decline service, reject orders, or restrict an account for a legitimate reason, including suspected fraud, security risk, rewards abuse, repeated uncollected orders, unlawful conduct, or a material violation of these Terms, subject to applicable law and nondiscrimination requirements. Purchased gift-card funds remain valid. Points are forfeited when an account closes, whether closure is voluntary or follows a permitted suspension or termination."
    ]),
    ("16 Changes", [
        "We may update these Terms prospectively by posting a revised version and effective date. The version in effect when an order is accepted governs that order. For a material change affecting existing accounts, we will provide appropriate notice and request acceptance when required before continued use of the affected service."
    ]),
    ("17 New Jersey law and disputes", [
        "New Jersey law governs these Terms, except where another law must apply. Disputes may be brought in an appropriate New Jersey state court or a federal court located in New Jersey, subject to any nonwaivable right to proceed elsewhere. Either party may use an eligible small-claims court. These Terms do not require arbitration or waive a jury trial. Contacting us first is encouraged but is not a condition of using a legal remedy or contacting a regulator."
    ]),
    ("18 General terms and contact", [
        "If a provision is unenforceable, it will be limited or severed only as necessary and the remaining provisions continue. A failure to enforce a provision once is not a waiver. We may assign these Terms with a sale or transfer of the business while preserving existing contractual rights. Provisions concerning payments, refunds, ownership, limitations, privacy, and disputes survive where their nature requires.",
        "Contact Deaf Shark Coffee at help@deafsharkcoffee.com, (908) 481-8884, through the website contact page, or at 900 Green Lane, Union, NJ 07083."
    ])
]


def create_policy(filename, title, sections):
    doc = base_document(title, "Effective September 14 2026  |  Draft for New Jersey attorney review")
    add_notice(doc, "Business rules updated September 14 2026. New Jersey counsel should still approve this draft before publication, and customer-facing promises must match the live checkout and store signage.")
    add_sections(doc, sections)
    doc.save(OUT / filename)


def add_risk(doc, level, title, finding, action):
    p = doc.add_paragraph(style="Risk Label")
    p.add_run(f"{level.upper()}  |  {title}")
    doc.add_paragraph(f"Finding: {finding}")
    p = doc.add_paragraph()
    r = p.add_run("Required action: ")
    r.bold = True
    p.add_run(action)


def create_audit():
    doc = base_document("Website Legal Audit and Redline Summary", "Deaf Shark Coffee  |  Review date September 14 2026")
    add_notice(doc, "This is a risk-focused operational and document review, not legal advice or a guarantee against claims. New Jersey counsel should approve the final documents and business rules before publication.")

    doc.add_heading("Executive conclusion", level=1)
    doc.add_paragraph("The AI-generated Privacy Policy is not publishable. It contains blank placeholders, broken text, inaccurate payment and mailing-address claims, and California provisions unrelated to the known operation. The AI-generated Terms are materially better but do not match the website or the owner's intended checkout model. The existing website policies also describe an obsolete third-party ordering flow. The replacement drafts cure the document-level defects, but the controls below must be implemented or confirmed so that the promises remain true in practice.")
    doc.add_paragraph("Confirmed operating decisions: Deaf Shark Coffee, LLC is the stated legal entity and Deaf Shark Coffee is the public brand; the shop is at 900 Green Lane, Union, NJ 07083; help@deafsharkcoffee.com receives legal requests; website orders are pickup only; website orders do not enter Genius POS automatically; Stripe is the selected online payment provider; guest and first account orders will be prepaid; returning account customers may choose online payment or payment at pickup; Twilio will be limited to an optional order-ready text; no personal information is sold; gift cards are physical only and do not expire; and advertising pixels are not currently active.")

    doc.add_heading("Launch blockers and material risks", level=1)
    add_risk(doc, "Critical", "Stripe checkout is not implemented", "Stripe has been selected, but the code still requires an account and offers only pay at pickup. The intended model requires prepaid guest and first-account orders, returning-customer payment choice, refunds, and a disclosed card surcharge.", "Keep prepaid guest checkout disabled until Stripe keys, webhooks, idempotent payment confirmation, refunds, dispute handling, first-order enforcement, and a surcharge no greater than the actual processing cost are implemented and tested. Never create a kitchen ticket from an unverified client-side payment result.")
    add_risk(doc, "Critical", "AI privacy template", "The supplied privacy draft contains literal blanks, corrupted characters, a duplicate heading, false card and mailing-address claims, and copied California language.", "Do not publish it. Replace it with the revised policy and have counsel confirm the entity name and applicable state-law scope.")
    add_risk(doc, "Implemented", "Versioned acceptance records", "Signup and renewed acceptance now store the Terms version, Privacy Policy version, acceptance timestamps, and age/guardian confirmation. Ordering is blocked until the current versions are accepted.", "Apply migration 0020 before deployment, test a new account and an older account, and update the version constants whenever either policy materially changes.")
    add_risk(doc, "Implemented", "Authenticated export and safe closure", "Account settings now offer an authenticated JSON export and confirmed account closure. Closure revokes access, forfeits points, removes direct profile data, suppresses marketing, and anonymizes retained order records.", "Apply migration 0020, test against a nonproduction copy, maintain a privacy-request log for requests received by email, and have counsel confirm all deletion exceptions.")
    add_risk(doc, "High", "Retention automation remains pending", "A written retention and deletion procedure now exists, but the database still retains orders, contact forms, applications, resumes, and other records indefinitely unless manually removed.", "Have the accountant and New Jersey counsel approve the working schedule, then implement scheduled deletion or anonymization, document backup rotation, and assign an owner to review the process annually.")
    add_risk(doc, "High", "Staff account security", "Admin access is limited by allowlisted staff email addresses, but multifactor authentication is not enforced and the owner indicated individual accounts are optional.", "Require a separate named Google account for every administrator, enforce Google multifactor authentication, prohibit shared credentials, review the allowlist quarterly, and remove access immediately when a staff member leaves.")
    add_risk(doc, "High", "Twilio STOP configuration remains pending", "Checkout now has an optional order-ready checkbox and stores the exact consent text and timestamp. The ready message is sent only for opted-in orders, but Twilio credentials and carrier-level STOP behavior are not yet configured or tested.", "Before enabling Twilio, use a Twilio number or Messaging Service with opt-out handling, test STOP and START end to end, retain suppression, and do not send marketing texts without a separate compliant opt-in.")
    add_risk(doc, "High", "Marketing email compliance", "Account signup can store a marketing opt-in, but campaigns and a working unsubscribe process are not live.", "Before sending promotions, choose a provider, include the shop's postal address, accurate sender information, and a one-step unsubscribe link, maintain suppression records, and honor opt-outs within 10 business days.")
    add_risk(doc, "High", "Future pixels and targeted advertising", "Advertising pixels are not currently active, but the owner plans to add them.", "Do not enable pixels until each vendor and event is inventoried, the policy names the relevant data uses, a consent/choice mechanism is implemented where required, and sensitive fields, order notes, and applicant data are excluded from tracking.")
    add_risk(doc, "Implemented", "Teen account attestation", "Signup and renewed acceptance now require confirmation that the user is at least 13 and, if under 18, has parent or guardian permission and involvement.", "Have New Jersey counsel confirm the contract approach for users aged 13 through 17, avoid child-directed marketing, and retain a process for deleting information submitted by a child under 13.")
    add_risk(doc, "Implemented", "Incident-response plan", "A written plan now covers reporting, first-hour containment, evidence preservation, vendor escalation, counsel and insurer notice, New Jersey review, communications, recovery, and post-incident work.", "Complete its owner, technical, insurer, counsel, and vendor contact sheet; keep an offline copy; and conduct a tabletop exercise at least annually.")
    add_risk(doc, "Moderate", "Refund and gift-card operations", "The owner confirmed full refunds only for prepaid cancellation before preparation, all sales final after preparation subject to nonwaivable law, and physical gift cards that never expire.", "Post the same all-sales-final and cancellation policy conspicuously at the register; train staff to record when preparation begins; honor required legal remedies and New Jersey cash redemption for gift-card balances of $5 or less; and display the required gift-card scam notice.")
    add_risk(doc, "Moderate", "Website accessibility", "A legal-policy rewrite does not establish that ordering, account, and status interfaces are accessible.", "Complete keyboard, screen-reader, focus, contrast, form-error, and zoom testing against WCAG 2.2 AA, prioritizing checkout and account flows.")
    add_risk(doc, "Moderate", "Entity verification", "The LLC name is presently supported only by the supplied AI documents.", "Verify the exact registered entity name and any trade-name registration against formation, tax, banking, lease, or insurance records before the entity is represented in the contract.")

    doc.add_heading("Recommended internal retention schedule", level=1)
    doc.add_paragraph("This schedule is a practical risk-control recommendation and should be confirmed with the company's accountant, insurer, and attorney before automation deletes records.")
    table = doc.add_table(rows=1, cols=3)
    table.style = "Table Grid"
    headers = ["Record", "Recommended period", "Disposition"]
    for i, text in enumerate(headers):
        table.cell(0, i).text = text
        set_cell_shading(table.cell(0, i), "0D5F5C")
        for run in table.cell(0, i).paragraphs[0].runs:
            run.font.color.rgb = RGBColor(255, 255, 255)
            run.bold = True
    repeat_table_header(table.rows[0])
    prevent_row_split(table.rows[0])
    rows = [
        ("Active account and profile", "While active", "Delete or anonymize after verified closure, except separated retained records"),
        ("Orders, refunds, taxes, financial summaries", "7 years", "Retain minimum transaction details; anonymize customer identifiers earlier when feasible"),
        ("Loyalty, referral, student and birthday data", "Account life plus 30 days", "Delete after closure unless needed for fraud or dispute records"),
        ("Contact inquiries", "2 years after closure", "Delete or anonymize"),
        ("Unsuccessful job applications and resumes", "2 years", "Securely delete from D1 and R2; hired records move to the personnel file"),
        ("Marketing consent and suppression", "While subscribed; suppression record as needed", "Keep only the minimum proof needed to honor opt-out"),
        ("Expired sessions and verification tokens", "90 days after expiration", "Delete"),
        ("Security and access logs", "Up to 12 months unless investigating an incident", "Delete or aggregate"),
        ("Backups", "Documented rolling window, preferably 35 to 90 days", "Expire automatically and test restoration/deletion procedures")
    ]
    for values in rows:
        row = table.add_row()
        prevent_row_split(row)
        cells = row.cells
        for i, value in enumerate(values):
            cells[i].text = value

    doc.add_page_break()
    doc.add_heading("New Jersey privacy-law scope", level=1)
    doc.add_paragraph("Based on the owner's expectation of a small customer base and the confirmation that Deaf Shark does not sell personal information, the New Jersey Data Privacy Act likely does not presently apply because it generally reaches businesses processing at least 100,000 consumers, or at least 25,000 consumers while receiving revenue or a discount from selling personal data. This must be reassessed annually and before targeted advertising or data-sharing practices change. Even when that statute does not apply, public privacy promises should remain accurate and security, breach, consumer-protection, communications, employment, and contract laws still matter.")

    doc.add_heading("Redline summary", level=1)
    changes = [
        ("Privacy scope", "Removed generic e-commerce and consent-by-use language; described the actual website, account, ordering, loyalty, student, application, and communications flows."),
        ("Payment claims", "Named Stripe as the selected processor, avoided claiming that Deaf Shark stores full card credentials, and added the actual-cost ceiling and advance disclosure for a credit-card surcharge."),
        ("California template", "Removed blank CCPA sale/opt-out text and replaced it with location-neutral request language plus a threshold review note in this audit."),
        ("Data categories", "Added order customizations, phone numbers, IP/user agent, sessions, Google sign-in, birthday, Kean verification, referrals, applications, resumes, consent records, and security data."),
        ("Vendors", "Added Cloudflare, Google, email delivery, Twilio, and Stripe; prohibited present advertising-pixel claims."),
        ("Terms eligibility", "Changed account age from 18 to 13, prohibited under-13 accounts, and added parent/guardian involvement for ages 13 through 17."),
        ("Ordering", "Replaced optional-account/guest promises with conditional guest checkout and conditional first-order online payment language."),
        ("Programs", "Aligned Terms with the 10% Kean discount, $8 birthday drink, referrals, welcome offers, promotions, and website rewards records."),
        ("Consumer policies", "Added the before-preparation cancellation cutoff, all-sales-final rule with nonwaivable-law protection, physical gift-card terms, 12-month point-lot expiration, point forfeiture on closure, no-stacking rule, and surcharge disclosure."),
        ("Disputes", "Kept New Jersey courts and small claims; did not add arbitration, a class-action waiver, or a direct-damages cap without attorney review.")
    ]
    table = doc.add_table(rows=1, cols=2)
    table.style = "Table Grid"
    for i, text in enumerate(["Area", "Material revision"]):
        table.cell(0, i).text = text
        set_cell_shading(table.cell(0, i), "0D5F5C")
        for run in table.cell(0, i).paragraphs[0].runs:
            run.font.color.rgb = RGBColor(255, 255, 255)
            run.bold = True
    repeat_table_header(table.rows[0])
    prevent_row_split(table.rows[0])
    for area, change in changes:
        row = table.add_row()
        prevent_row_split(row)
        cells = row.cells
        cells[0].text = area
        cells[1].text = change

    doc.add_heading("Primary sources reviewed", level=1)
    sources = [
        ("New Jersey Data Privacy Act, P.L. 2023, c.266", "https://pub.njleg.state.nj.us/Bills/2022/PL23/266_.PDF"),
        ("FTC CAN-SPAM compliance guide", "https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business"),
        ("FTC COPPA compliance questions", "https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions"),
        ("FTC Protecting Personal Information guide", "https://www.ftc.gov/business-guidance/resources/protecting-personal-information-guide-business"),
        ("New Jersey State Police breach-reporting guidance", "https://www.nj.gov/lps/njsp/division/investigations/cyber-crimes.shtml"),
        ("New Jersey refund-policy disclosure guide", "https://www.njconsumeraffairs.gov/News/Consumer%20Briefs/refund-policy-disclosures.pdf"),
        ("New Jersey gift-card consumer guide", "https://www.njconsumeraffairs.gov/News/Consumer%20Briefs/gift-cards-and-gift-certificates.pdf"),
        ("New Jersey cash-payment statute, P.L. 2021, c.28", "https://pub.njleg.state.nj.us/Bills/2020/PL21/28_.HTM"),
        ("New Jersey credit-card surcharge statute, P.L. 2023, c.146", "https://pub.njleg.state.nj.us/Bills/2022/PL23/146_.HTM"),
        ("U.S. Department of Justice web accessibility guidance", "https://www.justice.gov/archives/opa/pr/justice-department-issues-web-accessibility-guidance-under-americans-disabilities-act"),
        ("EEOC employment-record retention requirements", "https://www.eeoc.gov/employers/recordkeeping-requirements")
    ]
    for label, url in sources:
        p = doc.add_paragraph(style="List Bullet")
        add_hyperlink(p, label, url)

    doc.add_heading("Attorney review questions", level=1)
    doc.add_paragraph("Ask New Jersey counsel to confirm: the exact entity and trade name; treatment of contracts with customers aged 13 through 17; refund and no-show rules for prepaid prepared food; rewards amendment and forfeiture language; gift-card operations and notices; privacy-request exceptions and retention periods; online-payment processor terms; and whether additional county, municipal, employment, or food-service rules apply.")
    doc.save(OUT / "Deaf_Shark_Coffee_Legal_Audit_and_Redline_Summary.docx")


def create_retention_procedure():
    doc = base_document("Data Retention and Deletion Procedure", "Deaf Shark Coffee  |  Internal procedure  |  Version 1.0")
    add_notice(doc, "Effective only after owner approval. Automatic deletion remains disabled until the accountant and New Jersey counsel confirm the financial, employment, insurance, and dispute-retention periods.")
    add_sections(doc, [
        ("1 Purpose and owner", [
            "This procedure limits personal information to what Deaf Shark Coffee needs for service, security, legal, accounting, employment, and dispute purposes. The business owner is accountable for the schedule. A named technical administrator performs approved exports, anonymization, and deletion and records each run. No staff member may delete records informally."
        ]),
        ("2 Approved working schedule", [
            ("bullets", [
                "Active account and profile: retain while active. After authenticated closure, delete the profile and authentication records, forfeit loyalty benefits, and anonymize the account link, customer name, phone number, and text consent in retained orders.",
                "Orders, refunds, taxes, and financial summaries: retain minimum transaction records for seven years unless the accountant approves a different period. Remove direct customer identifiers earlier when operationally feasible.",
                "Loyalty, referral, student, birthday, and member-offer data: delete on verified account closure, normally within 30 days, unless a specific fraud or dispute hold applies.",
                "Contact inquiries: retain for up to two years after the matter closes, then delete or anonymize.",
                "Unsuccessful job applications and resumes: retain for two years, then securely delete. Records for hired applicants move to the personnel-record schedule.",
                "Marketing consent: retain while subscribed. After opt-out or closure, retain only a minimal suppression record needed to prevent future marketing.",
                "Expired sessions and verification tokens: delete within 90 days after expiration.",
                "Security and access logs: retain up to 12 months unless an active incident, fraud review, insurer request, or legal hold requires longer.",
                "Backups: use a documented rolling window of 35 to 90 days and allow deleted data to age out through normal rotation."
            ])
        ]),
        ("3 Account closure", [
            "The customer must be authenticated and type DELETE to confirm closure. The system revokes sessions, removes authentication and profile records, deletes loyalty and offer records, changes marketing to unsubscribed, and anonymizes retained order records. It does not erase transaction amounts, taxes, ordered items, status, or dates needed for accounting, refunds, fraud review, or disputes. Contact-form and employment records are evaluated under their own schedules because they may have been submitted for a separate purpose."
        ]),
        ("4 Information downloads and manual requests", [
            "An authenticated customer may download a JSON copy from account settings. Requests received at help@deafsharkcoffee.com must be logged with the date, identity-verification method, scope, decision, response date, and any exception. Never send password hashes, session tokens, authentication tokens, internal security signals, or another person's information. Escalate uncertain requests to counsel."
        ]),
        ("5 Quarterly review process", [
            ("bullets", [
                "Export a count by record category and age without exposing record contents unnecessarily.",
                "Check for records past the approved period and for deletion jobs that failed.",
                "Confirm that legal, insurer, chargeback, tax, employment, and incident holds are documented before deletion.",
                "Run approved deletion or anonymization against a backup-tested procedure, then record counts and completion time.",
                "Review staff access, remove departed personnel, and verify every administrator uses an individual account with multifactor authentication.",
                "Review vendors, policy versions, marketing tools, pixels, and new data fields for schedule changes."
            ])
        ]),
        ("6 Legal holds and exceptions", [
            "Suspend normal deletion only for a documented reason such as a subpoena, threatened claim, active chargeback, tax examination, employment matter, security incident, or insurer instruction. Record the affected category, approving person, start date, and review date. Release the hold promptly when the reason ends and resume normal disposition."
        ]),
        ("7 Annual approval", [
            "The owner reviews this procedure at least annually and whenever payment, marketing, text messaging, employment, analytics, gift-card, or ordering practices change. The accountant confirms financial periods; counsel confirms legal exceptions; and the technical administrator confirms that the live database, backups, logs, and vendor systems match the approved schedule."
        ]),
    ])
    doc.save(OUT / "Deaf_Shark_Coffee_Data_Retention_and_Deletion_Procedure.docx")


def create_breach_plan():
    doc = base_document("Data Breach Response Plan", "Deaf Shark Coffee  |  Internal procedure  |  Version 1.0")
    add_notice(doc, "Keep an offline copy of this plan. It is an operational checklist, not a substitute for breach counsel, insurer instructions, law-enforcement direction, or vendor incident procedures.")
    add_sections(doc, [
        ("1 Report and activate", [
            "Anyone who notices a lost device, exposed credential, suspicious login, malware, misdirected customer data, unauthorized database access, vendor alert, or accidental public file must immediately notify the owner and technical administrator. Do not investigate through personal accounts or discuss the incident publicly. Record who reported it, when it was discovered, affected systems, and known facts without guessing."
        ]),
        ("2 First-hour containment", [
            ("bullets", [
                "Preserve evidence: screenshots, audit logs, emails, timestamps, affected URLs, account identifiers, and vendor ticket numbers. Do not erase logs or rebuild affected systems before evidence is saved.",
                "Contain access: disable compromised accounts, revoke sessions and API keys, rotate affected secrets, isolate exposed systems, and restrict database access. Do not destroy the only evidence copy.",
                "Protect operations: pause affected checkout, account, messaging, or application features if continued operation could increase harm.",
                "Contact the cyber insurer before hiring outside vendors or making admissions if the policy requires prior approval.",
                "Open urgent tickets with Cloudflare, Stripe, Google, Twilio, email, hosting, or other affected providers and preserve their responses."
            ])
        ]),
        ("3 Assess scope and risk", [
            "Create a verified inventory of what happened, the access window, systems and vendors involved, individuals and jurisdictions affected, data elements exposed, whether data was encrypted, evidence of acquisition or misuse, restoration status, and continuing risks. Separate confirmed facts from assumptions. Preserve a decision log and chain of custody for exported evidence."
        ]),
        ("4 Legal and regulatory review", [
            "Promptly involve qualified breach counsel when personal information may have been accessed or acquired without authorization. Counsel should determine whether notification duties apply, deadlines, content, substitute notice, consumer reporting obligations, contractual notices, and law-enforcement coordination. For a qualifying New Jersey breach, follow current New Jersey requirements, including notifying the New Jersey State Police Cyber Crimes Unit before notifying affected New Jersey customers when required. Do not delay a required notice for marketing or reputation reasons."
        ]),
        ("5 Customer and partner communications", [
            "Use one approved factual message that states what happened, the dates, information involved, actions taken, steps customers can take, and a reliable contact method. Do not speculate, minimize, promise that no harm can occur, or include sensitive data in the notice. Coordinate notices to affected vendors, payment partners, insurers, banks, regulators, and law enforcement as counsel directs. Maintain copies and delivery records."
        ]),
        ("6 Recovery", [
            ("bullets", [
                "Verify the vulnerability is closed before restoring affected functions.",
                "Restore from known-good backups and validate permissions, logging, rate limits, multifactor authentication, and secret rotation.",
                "Monitor for repeat access, fraud, chargebacks, credential attacks, and suspicious account changes.",
                "Provide staff with narrowly tailored instructions and a single contact for customer questions.",
                "Document systems restored, tests performed, unresolved risks, and the owner who approved return to service."
            ])
        ]),
        ("7 Post-incident review", [
            "Within 14 days after containment, document root cause, impact, response times, decisions, notices, costs, evidence location, and corrective actions with owners and deadlines. Update access controls, retention, vendor settings, training, policies, and this plan. Preserve the incident file for the period approved by counsel and the insurer. Conduct a tabletop exercise at least annually."
        ]),
        ("8 Contact sheet to complete before launch", [
            ("bullets", [
                "Business owner and after-hours number.",
                "Technical administrator and backup contact.",
                "Cyber insurer policy number and incident hotline.",
                "New Jersey breach/privacy counsel.",
                "Cloudflare, Stripe, Google, Twilio, email provider, bank, and POS support contacts.",
                "New Jersey State Police Cyber Crimes Unit current reporting channel, verified from nj.gov at the time of an incident."
            ])
        ]),
    ])
    doc.save(OUT / "Deaf_Shark_Coffee_Data_Breach_Response_Plan.docx")


def style_matrix_table(table, widths=None):
    table.style = "Table Grid"
    header = table.rows[0]
    repeat_table_header(header)
    prevent_row_split(header)
    for cell in header.cells:
        set_cell_shading(cell, "0D5F5C")
        cell.vertical_alignment = 1
        for run in cell.paragraphs[0].runs:
            run.font.color.rgb = RGBColor(255, 255, 255)
            run.bold = True
            run.font.size = Pt(9)
    for row_index, row in enumerate(table.rows[1:], start=1):
        prevent_row_split(row)
        if row_index % 2 == 0:
            for cell in row.cells:
                set_cell_shading(cell, "F4F7F7")
        for cell in row.cells:
            cell.vertical_alignment = 1
            for paragraph in cell.paragraphs:
                paragraph.paragraph_format.space_after = Pt(2)
                paragraph.paragraph_format.line_spacing = 1.04
                for run in paragraph.runs:
                    run.font.size = Pt(9)
    if widths:
        for row in table.rows:
            for index, width in enumerate(widths):
                row.cells[index].width = Inches(width)


def add_checklist(doc, items):
    for item in items:
        p = doc.add_paragraph(style="List Bullet")
        p.paragraph_format.keep_together = True
        p.add_run(item)


def create_professional_handoff():
    doc = base_document(
        "Website Legal and Compliance Completion Package",
        "Deaf Shark Coffee  |  Instructions for counsel accounting and technical implementation  |  14 September 2026",
    )
    doc.sections[0].header.paragraphs[0].text = "DEAF SHARK COFFEE  |  COMPLETION PACKAGE"
    for run in doc.sections[0].header.paragraphs[0].runs:
        run.font.color.rgb = INK
        run.font.bold = True
    doc.sections[0].footer.paragraphs[0].clear()
    footer = doc.sections[0].footer.paragraphs[0]
    footer.add_run("Confidential working package  |  ")
    add_page_number(footer)

    doc.add_paragraph(
        "Please use this package to complete the legal, accounting, and technical work needed before the website's payment, messaging, marketing, tracking, and automated deletion features are activated in production. The business decisions below are approved. Routine drafting and implementation choices should be resolved by the responsible professional without returning to the owner for another business questionnaire."
    )
    doc.add_paragraph(
        "The attorney should make any legally required correction, the accountant should choose a conservative compliant recordkeeping treatment within ordinary professional practice, and the technical team should implement the approved result securely. If a requirement would materially change the business model, create a new recurring cost above ordinary vendor charges, or prevent the stated ordering model from operating, flag that issue with a recommended solution and the narrow decision still required."
    )

    doc.add_heading("1 Instructions and decision authority", level=1)
    add_checklist(doc, [
        "Treat the confirmed facts and business rules in this package as approved instructions.",
        "Correct legal drafting, accounting treatment, disclosures, workflows, and security controls as needed for compliance and reliable operation.",
        "Use the safest compliant interpretation when two reasonable approaches exist, and record the choice in the final implementation notes.",
        "Do not activate online payments, promotional email, advertising pixels, order-ready texts, or automated deletion until the acceptance criteria for that feature are met.",
        "Do not request or exchange passwords, secret keys, recovery codes, or full database exports by email. Use named accounts, role-based invitations, and approved secret storage.",
        "Return one coordinated completion package containing final legal documents, the approved retention schedule, an implementation report, test evidence, and a short list of any genuine owner decisions that could not be resolved professionally.",
    ])

    doc.add_heading("2 Confirmed business identity and contacts", level=1)
    table = doc.add_table(rows=1, cols=2)
    table.rows[0].cells[0].text = "Item"
    table.rows[0].cells[1].text = "Confirmed instruction"
    identity_rows = [
        ("Public brand", "Deaf Shark Coffee"),
        ("Entity used in supplied drafts", "Deaf Shark Coffee, LLC, doing business as Deaf Shark Coffee. Counsel must verify the registered entity and any trade name from official records before final publication."),
        ("Store and pickup address", "900 Green Lane, Union, New Jersey 07083"),
        ("Customer and privacy email", "help@deafsharkcoffee.com"),
        ("Telephone", "(908) 481-8884"),
        ("Website", "deafsharkcoffee.com"),
        ("Order model", "Pickup only. Website orders do not transfer automatically into Genius POS."),
        ("Expected scale", "A small customer base is expected. Reassess privacy-law thresholds annually and before any targeted advertising or data-sharing change."),
        ("Data sale", "The business does not sell personal information."),
    ]
    for left, right in identity_rows:
        cells = table.add_row().cells
        cells[0].text = left
        cells[1].text = right
    style_matrix_table(table, [1.75, 4.95])

    doc.add_heading("3 Confirmed ordering payment and refund rules", level=1)
    add_checklist(doc, [
        "Stripe is the selected online payment processor.",
        "Guest orders must be prepaid online.",
        "A customer's first account order must be prepaid online.",
        "After a successful first order, a returning account customer may choose online payment or payment at the store when that option is offered at checkout.",
        "The checkout may apply a credit-card surcharge. It must be disclosed clearly before order submission and must not exceed the lowest applicable limit, including actual processing cost, law, card-network rules, and processor terms. Debit and prepaid cards must not be surcharged unless counsel and the processor confirm that the specific transaction is permitted.",
        "A prepaid order receives a full refund if the customer cancels before preparation begins. The default operational cutoff is the earlier of staff changing the order to Preparing or staff beginning to make any item.",
        "After preparation begins, the order is final for change of mind, taste preference, late arrival, or failure to collect it. Nothing may waive a remedy required by law. Staff may remake or replace an incorrect, missing, defective, or substantiated quality item.",
        "If the shop cancels a prepaid order or cannot provide a paid item, the affected amount must be refunded to the original payment method.",
    ])

    doc.add_heading("4 Confirmed account rewards marketing and gift card rules", level=1)
    table = doc.add_table(rows=1, cols=2)
    table.rows[0].cells[0].text = "Program"
    table.rows[0].cells[1].text = "Approved rule"
    program_rows = [
        ("Accounts and age", "No account for anyone under 13. Customers aged 13 through 17 may use an account only with parent or guardian permission and involvement."),
        ("Policy acceptance", "Account creation and ordering must record the exact Terms and Privacy Policy versions accepted, the acceptance time, and the required age or guardian confirmation."),
        ("Customer data", "Keep account data while the account is active. Provide authenticated download and safe closure. On closure, delete or anonymize identifiers while preserving only records required for accounting, disputes, fraud prevention, legal holds, or suppression."),
        ("Rewards", "Each award of points expires 12 months after the order or award that created it. Redeem the oldest eligible points first. Account closure forfeits unused points."),
        ("Discount stacking", "Rewards, discounts, and promotional offers may not be combined unless the specific offer says otherwise."),
        ("Student discount", "The current Kean and Wenzhou-Kean student discount is 10 percent, subject to eligibility verification and current program terms."),
        ("Birthday benefit", "The current benefit is one free drink valued up to $8, redeemable in store on the customer's birthday, subject to eligibility and current program terms."),
        ("Gift cards", "Physical cards only for now. They are not sold online, never expire, and carry no inactivity fee. Operations must honor applicable New Jersey cash-redemption and anti-scam notice requirements."),
        ("Order-ready texts", "Optional transactional text only. No marketing texts. Consent must be separate and voluntary, and STOP suppression must work."),
        ("Promotional email", "Not live yet. Use an established provider that supports one-step unsubscribe, suppression, and a valid postal address. Do not send campaigns until those controls are tested."),
        ("Advertising pixels", "Meta, Google, TikTok, and similar tracking are not live. Keep them disabled until the final inventory, policy disclosure, consent design, and withdrawal behavior are approved and tested."),
    ]
    for left, right in program_rows:
        cells = table.add_row().cells
        cells[0].text = left
        cells[1].text = right
    style_matrix_table(table, [1.55, 5.15])

    doc.add_page_break()
    doc.add_heading("5 Work for New Jersey counsel", level=1)
    doc.add_paragraph(
        "Counsel should review the revised documents and the live customer journey together. The final language must describe the system that will actually be deployed, not a future feature or a generic template. Counsel may edit the supplied drafts directly and should resolve routine wording without returning to the owner."
    )
    add_checklist(doc, [
        "Verify the exact legal entity, assumed name, address, and authority to contract from formation, tax, banking, lease, insurance, or state records.",
        "Approve the Terms of Service and Privacy Policy, including the age 13 through 17 approach, policy-version acceptance, account closure, authenticated export, and retained transaction records.",
        "Approve the cancellation cutoff, prepared-food all-sales-final rule, no-show treatment, remake or replacement language, and the register or receipt disclosures required in New Jersey.",
        "Approve the point-lot expiration, oldest-first redemption, forfeiture on closure, amendment language, student discount, birthday benefit, referral terms, and no-stacking rule.",
        "Approve physical gift-card terms, New Jersey cash redemption for qualifying low balances, and the required scam warning or operational notice.",
        "Approve the online credit-card surcharge disclosure, amount rule, eligible card types, refund treatment, and any required receipt language under New Jersey law, card-network rules, and Stripe's terms.",
        "Review privacy-request verification, exceptions, deletion and anonymization, breach duties, vendor disclosures, cookies, optional messaging, and planned advertising tools.",
        "Review liability, warranties, dispute venue, small-claims treatment, New Jersey consumer-protection law, ADA accessibility exposure, and any Union Township, county, food-service, employment, or local disclosure requirement.",
    ])
    doc.add_paragraph().add_run("Counsel deliverables").bold = True
    add_checklist(doc, [
        "Final clean Terms of Service and Privacy Policy with effective dates and version identifiers.",
        "Final customer-facing refund, cancellation, no-show, surcharge, rewards, gift-card, and messaging disclosures, including where each must appear online and in the store.",
        "A short implementation checklist identifying every required consent, notice, record, timing rule, and prohibited practice.",
        "A redline or concise change summary and written confirmation that the final documents are approved for the stated New Jersey business model, subject to any clearly listed conditions.",
    ])

    doc.add_heading("6 Work for the accountant", level=1)
    doc.add_paragraph(
        "The accountant should confirm the records needed for tax, payment, refund, chargeback, insurance, and financial-statement purposes. The working schedule proposes seven years for order, refund, tax, and financial records. If another conservative period is more appropriate, the accountant should choose it and document the reason without sending a new preference questionnaire to the owner."
    )
    add_checklist(doc, [
        "Approve a retention period for orders, refunds, taxes, discounts, surcharges, Stripe payouts and fees, payment status, disputes, and chargebacks.",
        "Specify the minimum fields that must remain after account deletion and which customer identifiers should be removed or tokenized earlier.",
        "Confirm treatment and reconciliation of sales tax, card surcharges, Stripe fees, refunds, partial refunds, failed payments, chargebacks, pay-at-store orders, rewards, discounts, and gift-card liabilities.",
        "Confirm backup and source-document periods and any legal-hold coordination needed before automated deletion.",
        "Identify the records needed to support daily closeout and reconcile website orders that do not enter Genius POS automatically.",
    ])
    doc.add_paragraph().add_run("Accountant deliverables").bold = True
    add_checklist(doc, [
        "A signed and dated retention schedule by record category.",
        "Specific deletion or anonymization instructions for the database and backups.",
        "A reconciliation procedure for Stripe, the website order database, pay-at-store transactions, refunds, surcharges, taxes, and Genius POS.",
        "Written approval of the financial and recordkeeping treatment, with any implementation conditions clearly listed.",
    ])

    doc.add_heading("7 Work for the technical team", level=1)
    doc.add_paragraph(
        "The technical team should implement the final legal and accounting instructions in staging, test them with nonproduction data, and then deploy through the normal release process. A feature is not complete merely because its screen exists; the database record, authorization, failure handling, audit evidence, accessibility, and production configuration must also work."
    )

    technical_rows = [
        ("Database and policy records", "Apply migration 0020 in staging and production. Preserve exact Terms and Privacy versions, timestamps, age or guardian confirmation, and optional text consent evidence. Verify backup and rollback procedures."),
        ("Stripe payments", "Use secure Stripe Checkout or Payment Intents, server-side amount calculation, trusted webhooks, signature verification, idempotency, payment-state handling, refunds, and reconciliation. Create or release the kitchen order only after trusted payment confirmation for prepaid orders."),
        ("Payment eligibility", "Enforce guest prepaid and first-account-order prepaid. Permit pay at store only for an eligible returning account. Define success, failure, retry, duplicate-submission, refund, and chargeback states."),
        ("Surcharge", "Calculate no more than the lowest permitted amount and show it before final submission. Record the basis and amount. Do not guess a percentage or apply it to an ineligible card type."),
        ("Preparation cutoff", "Record the earlier of the Preparing status change or actual preparation start. Use that timestamp to control automatic refund eligibility and preserve an audit trail."),
        ("Rewards", "Store points as dated award lots, expire each lot after 12 months, consume oldest points first, and document a safe treatment for existing balances before enabling expiry."),
        ("Account export and closure", "Test authenticated export and typed confirmation. Revoke sessions, remove profile and rewards data, retain minimal suppression, and anonymize order identifiers without deleting necessary financial records. Confirm authorization and repeat-request behavior."),
        ("Administrator security", "Require a named administrator account for each person, Google multifactor authentication, least-privilege roles, no shared login, prompt removal of departed staff, access logging, and quarterly access review."),
        ("Twilio", "Use the stored optional consent only for one order-ready text. Configure credentials securely, honor carrier STOP and START behavior, suppress opted-out numbers, log delivery status, and test with consent on and off. Do not send marketing texts."),
        ("Promotional email", "Select a reputable low-volume provider with unsubscribe and suppression support. Authenticate the domain, include the postal address, import only eligible recipients, and test one-step opt-out before the first campaign."),
        ("Cookies and pixels", "Inventory every cookie, SDK, tag, and recipient. Keep advertising tags disabled until counsel approves the disclosure and the consent system prevents loading before consent and honors withdrawal."),
        ("Retention automation", "Do not enable scheduled deletion until counsel and the accountant approve the schedule. Then implement dry-run reporting, legal holds, backup rotation, logs, exception handling, and owner-approved production activation."),
        ("Accessibility", "Audit sign-up, sign-in, account, menu, cart, checkout, order status, export, deletion, and consent controls against WCAG 2.2 AA. Test keyboard operation, focus, labels, errors, contrast, zoom, and screen-reader announcements."),
        ("Production release", "Use staging acceptance tests, a release checklist, monitoring, backups, incident contacts, and a post-deployment smoke test. Record the deployed policy versions and feature configuration."),
    ]
    table = doc.add_table(rows=1, cols=2)
    table.rows[0].cells[0].text = "Area"
    table.rows[0].cells[1].text = "Required implementation"
    for left, right in technical_rows:
        cells = table.add_row().cells
        cells[0].text = left
        cells[1].text = right
    style_matrix_table(table, [1.45, 5.25])

    doc.add_heading("8 Technical acceptance evidence", level=1)
    add_checklist(doc, [
        "Migration logs and schema verification from staging and production.",
        "Screenshots or test records for new acceptance, reacceptance, guest prepaid, first-order prepaid, returning pay-at-store, refund cutoff, export, closure, SMS opt-in and opt-out, and administrator MFA.",
        "Stripe test-mode evidence covering success, decline, abandoned payment, duplicate webhook, duplicate submission, refund, partial failure, and reconciliation.",
        "Accessibility findings and fixes for the critical customer flows, with any accepted residual issue assigned an owner and date.",
        "A production configuration inventory showing which email, SMS, pixel, retention, and payment features are enabled or intentionally disabled.",
        "A completion report listing deployed commit or release, database migration, test date, tester, unresolved risks, and rollback procedure.",
    ])

    doc.add_heading("9 Default assumptions that prevent routine questions", level=1)
    defaults = [
        ("Preparation begins", "Use the earlier of the order being changed to Preparing or a staff member beginning any item."),
        ("Surcharge amount", "Use the lowest amount allowed by actual processing cost, applicable law, card-network rules, and Stripe. If card-type detection is insufficient, do not charge the surcharge for that transaction."),
        ("Marketing provider", "The technical team may choose a reputable low-volume provider that supports domain authentication, one-step unsubscribe, suppression, export, and deletion. No campaign may start until counsel approves the final disclosure and the flow is tested."),
        ("Text messaging", "Order-ready transactional text only, one message per opted-in order. No promotional text program."),
        ("Advertising tracking", "No Meta, Google, TikTok, or similar advertising tag may load until the inventory, policy, and consent behavior are approved."),
        ("Retention", "Use the current seven-year working period for financial design only. Keep automated deletion disabled until the accountant and counsel approve a signed schedule."),
        ("Rewards", "No stacking unless the specific promotion states otherwise. Expire dated award lots after 12 months and use oldest points first."),
        ("Security", "Use individual named accounts, multifactor authentication, least privilege, and no credential sharing."),
        ("Professional correction", "Counsel, accounting, and technical personnel may correct ordinary legal, financial, drafting, and implementation details within this business model and must document the final choice."),
    ]
    table = doc.add_table(rows=1, cols=2)
    table.rows[0].cells[0].text = "Question area"
    table.rows[0].cells[1].text = "Default instruction"
    for left, right in defaults:
        cells = table.add_row().cells
        cells[0].text = left
        cells[1].text = right
    style_matrix_table(table, [1.65, 5.05])

    doc.add_heading("10 Access and materials to provide", level=1)
    doc.add_paragraph(
        "Provide access through role-based invitations and secure secret-management channels. Do not place credentials in this document or in the cover email. Give each professional only the access needed for that person's work."
    )
    add_checklist(doc, [
        "Official entity evidence such as formation record, W-9, lease, bank record, insurance declaration, and any trade-name filing.",
        "Role-based access to the website repository, staging environment, production deployment, Cloudflare, domain and DNS, Google authentication and Workspace, Stripe, Twilio when opened, email provider when selected, and staging and production databases.",
        "Current store refund and gift-card signs, printed receipts, loyalty and promotion materials, customer-facing order confirmations, and staff operating instructions.",
        "A completed incident contact sheet naming the owner, backup owner, technical contact, cyber insurer and hotline, New Jersey counsel, bank, and critical vendor support contacts.",
    ])

    doc.add_heading("11 Attachments for review", level=1)
    attachments = [
        "Deaf_Shark_Coffee_Legal_Audit_and_Redline_Summary.docx",
        "Deaf_Shark_Coffee_Privacy_Policy_Revised.docx",
        "Deaf_Shark_Coffee_Terms_of_Service_Revised.docx",
        "Deaf_Shark_Coffee_Data_Retention_and_Deletion_Procedure.docx",
        "Deaf_Shark_Coffee_Data_Breach_Response_Plan.docx",
        "DSC - Online Privacy Policy.docx, the prior supplied draft",
        "DSC_Terms_of_Use.docx, the prior supplied draft",
        "Relevant repository files, including drizzle/0020_legal_controls.sql, lib/legal-policy.ts, account onboarding, checkout, profile export, profile closure, SMS, rewards, and administrator authorization code",
    ]
    add_checklist(doc, attachments)

    doc.add_heading("12 Required return package and sign off", level=1)
    table = doc.add_table(rows=1, cols=4)
    headers = ["Workstream", "Owner", "Required return", "Completion standard"]
    for index, header in enumerate(headers):
        table.rows[0].cells[index].text = header
    signoff_rows = [
        ("Legal", "New Jersey counsel", "Final policies, required notices, implementation checklist, and approval note", "Entity verified; live practices accurately described; conditions and required placements identified"),
        ("Accounting", "Accountant or CPA", "Signed retention schedule, deletion field list, and reconciliation procedure", "Tax, payment, refund, surcharge, chargeback, backup, and POS records addressed"),
        ("Technical", "Lead developer or administrator", "Implementation report, test evidence, release record, and configuration inventory", "All approved controls operate in staging and production; disabled features remain disabled"),
        ("Operations", "Store owner or manager", "Staff procedure, posted notices, incident contacts, and training record", "Preparation cutoff, cancellations, refunds, gift cards, ready texts, and account questions handled consistently"),
    ]
    for values in signoff_rows:
        cells = table.add_row().cells
        for index, value in enumerate(values):
            cells[index].text = value
    style_matrix_table(table, [1.0, 1.25, 2.25, 2.2])

    doc.add_paragraph(
        "Final approval should be recorded only after the legal documents, accounting schedule, production configuration, customer disclosures, staff procedures, and test evidence agree with one another. A policy posted on the website does not cure a conflicting checkout flow or store practice."
    )
    doc.save(OUT / "Deaf_Shark_Coffee_Professional_Handoff_Package.docx")


if __name__ == "__main__":
    create_policy("Deaf_Shark_Coffee_Privacy_Policy_Revised.docx", "Deaf Shark Coffee Privacy Policy", PRIVACY_SECTIONS)
    create_policy("Deaf_Shark_Coffee_Terms_of_Service_Revised.docx", "Deaf Shark Coffee Terms of Service", TERMS_SECTIONS)
    create_audit()
    create_retention_procedure()
    create_breach_plan()
    create_professional_handoff()
    print(f"Created legal documents in {OUT}")
