import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, HRFlowable, PageBreak
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            # First page / cover page: draw border accent
            self.saveState()
            self.setStrokeColor(colors.HexColor('#FFF559'))
            self.setLineWidth(3)
            self.rect(20, 20, 572, 752, fill=0, stroke=1)
            self.restoreState()
            return

        self.saveState()
        # Top banner line
        self.setStrokeColor(colors.HexColor('#22252C'))
        self.setLineWidth(1)
        self.line(40, 750, 572, 750)
        
        # Header text
        self.setFont('Helvetica-Bold', 8)
        self.setFillColor(colors.HexColor('#FFF559'))
        self.drawString(40, 756, "DECK SALONE")
        self.setFont('Helvetica', 8)
        self.setFillColor(colors.HexColor('#8A909D'))
        self.drawString(108, 756, "— Official Platform & Brand Profile")
        self.drawRightString(572, 756, "A SOUND IT ENTERTAINMENT COMPANY")
        
        # Bottom footer line
        self.line(40, 45, 572, 45)
        self.setFont('Helvetica', 8)
        self.setFillColor(colors.HexColor('#8A909D'))
        self.drawString(40, 32, "Deck Salone • https://decksalone.com • support@decksalone.com")
        self.drawRightString(572, 32, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_deck_salone_pdf(output_path, logo_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary_dark = colors.HexColor('#0B0C0E')
    c_surface_dark = colors.HexColor('#13161C')
    c_card_border = colors.HexColor('#262A34')
    c_yellow = colors.HexColor('#FFF559')
    c_gold = colors.HexColor('#E5D338')
    c_text_white = colors.HexColor('#FFFFFF')
    c_text_muted = colors.HexColor('#9EADB9')
    c_text_body = colors.HexColor('#D5DBE1')
    
    # Custom Typography Styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=32,
        textColor=c_yellow,
        alignment=0,
        spaceAfter=8
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=c_text_body,
        spaceAfter=14
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=c_yellow,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    
    subsection_heading = ParagraphStyle(
        'SubSectionHeading',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=c_text_white,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=c_text_body,
        spaceAfter=8
    )
    
    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=c_text_body,
        leftIndent=12,
        firstLineIndent=-12,
        spaceAfter=4
    )
    
    highlight_box_style = ParagraphStyle(
        'HighlightBoxText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14.5,
        textColor=colors.HexColor('#0B0C0E'),
        alignment=1
    )
    
    card_title_style = ParagraphStyle(
        'CardTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=c_yellow
    )
    
    card_body_style = ParagraphStyle(
        'CardBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=c_text_body
    )

    story = []
    
    # ─── COVER PAGE ──────────────────────────────────────────
    story.append(Spacer(1, 20))
    if os.path.exists(logo_path):
        # Header Logo
        logo_img = Image(logo_path, width=3.8*inch, height=1.1*inch)
        logo_img.hAlign = 'LEFT'
        story.append(logo_img)
    story.append(Spacer(1, 22))
    
    tag_table = Table([
        [
            Paragraph("<font color='#000000'><b>OFFICIAL PLATFORM & BRAND PROFILE</b></font>", highlight_box_style),
            Paragraph("<font color='#FFF559'><b>A SOUND IT ENTERTAINMENT COMPANY</b></font>", ParagraphStyle('RTag', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8.5, textColor=c_yellow, alignment=2))
        ]
    ], colWidths=[240, 292])
    tag_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), c_yellow),
        ('ALIGN', (0,0), (0,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(tag_table)
    story.append(Spacer(1, 14))
    
    story.append(Paragraph("THE DIGITAL HOME OF SIERRA LEONEAN DJ CULTURE", title_style))
    story.append(Paragraph("<b>Where Sierra Leone DJs connect, compete, earn & grow.</b> A unified digital infrastructure empowering talent, streamlining bookings, and connecting African music culture to the global diaspora.", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_yellow, spaceAfter=14))
    
    # Key Highlights Grid (Cover)
    meta_data = [
        [
            Paragraph("<b>FOUNDER & CEO</b><br/><font color='#FFFFFF'>Frederick Julian Max-Macauley<br/>(DJ Fred Max)</font>", card_body_style),
            Paragraph("<b>PARENT COMPANY</b><br/><font color='#FFFFFF'>Sound It Entertainment</font>", card_body_style),
            Paragraph("<b>CORE TERRITORY</b><br/><font color='#FFFFFF'>Sierra Leone & West Africa (Scaling Globally)</font>", card_body_style),
        ],
        [
            Paragraph("<b>PRIMARY AUDIENCE</b><br/><font color='#FFFFFF'>DJs, Music Fans, Promoters, Clubs & Brands</font>", card_body_style),
            Paragraph("<b>PLATFORM ECOSYSTEM</b><br/><font color='#FFFFFF'>Mix Streaming, EPK Profiles, Bookings, Battles, Royalties</font>", card_body_style),
            Paragraph("<b>WEB DESTINATION</b><br/><font color='#FFF559'>https://decksalone.com</font>", card_body_style),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[175, 175, 182])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_surface_dark),
        ('BOX', (0,0), (-1,-1), 1, c_card_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_card_border),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'TOP')
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 16))
    
    story.append(Paragraph("Executive Overview", section_heading))
    story.append(Paragraph(
        "<b>Deck Salone</b> is Sierra Leone's official DJ ecosystem — a pioneering digital platform engineered to professionalize the DJ industry, preserve cultural musical heritage, and unlock sustainable creative careers. Created as the comprehensive home for Sierra Leone's DJ community, Deck Salone unifies talent discovery, direct event bookings, streaming analytics, weekly battle tournaments, and creator monetization into a singular, mobile-first Web application.",
        body_style
    ))
    story.append(Paragraph(
        "While historically Sierra Leonean DJs drove nightlife, radio, street festivals, and private celebrations, they lacked structured digital presence, monetization channels, and international visibility. Deck Salone bridges this critical infrastructure gap. Developed and operated under <b>Sound It Entertainment</b>, Deck Salone serves as both a national creative powerhouse and a gateway connecting African talent to the global entertainment economy.",
        body_style
    ))
    
    story.append(PageBreak())

    # ─── PAGE 2: BRAND ARCHITECTURE, MISSION & VALUES ─────────
    story.append(Paragraph("1. Brand Architecture & Heritage", section_heading))
    
    brand_arch_data = [
        [
            Paragraph("<b>PARENT COMPANY</b>", card_title_style),
            Paragraph("<b>PRODUCT BRAND</b>", card_title_style),
            Paragraph("<b>FOUNDER BRAND</b>", card_title_style)
        ],
        [
            Paragraph("<b>Sound It Entertainment</b><br/><br/>A leading entertainment and technology company building platforms, experiences, and commercial opportunities that help African creative talent be heard, discovered, connected, and rewarded.", card_body_style),
            Paragraph("<b>Deck Salone</b><br/><br/>The dedicated digital ecosystem where DJs upload mixes, build verified Electronic Press Kits (EPK), gain listeners, compete in weekly charts, and secure paid bookings.", card_body_style),
            Paragraph("<b>Fred Max (Founder)</b><br/><br/>Frederick Julian Max-Macauley is an entertainment visionary and platform architect committed to creating meaningful digital infrastructure for African music and creators.", card_body_style)
        ]
    ]
    arch_table = Table(brand_arch_data, colWidths=[175, 175, 182])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_surface_dark),
        ('BOX', (0,0), (-1,-1), 1, c_card_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_card_border),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 9),
        ('RIGHTPADDING', (0,0), (-1,-1), 9),
        ('VALIGN', (0,0), (-1,-1), 'TOP')
    ]))
    story.append(arch_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("2. Strategic Purpose, Vision & Mission", section_heading))
    
    purpose_data = [
        [
            Paragraph("<b>BRAND PURPOSE</b>", ParagraphStyle('PT', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, textColor=c_yellow)),
            Paragraph("To give Sierra Leonean and African DJs a professional digital home where they can share their sound, build their identity, reach listeners, earn income, secure bookings, and grow their careers.", card_body_style)
        ],
        [
            Paragraph("<b>BRAND VISION</b>", ParagraphStyle('PT', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, textColor=c_yellow)),
            Paragraph("To become Africa’s leading digital platform for DJs, mixes, bookings, talent discovery, and creator-first music communities.", card_body_style)
        ],
        [
            Paragraph("<b>BRAND MISSION</b>", ParagraphStyle('PT', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, textColor=c_yellow)),
            Paragraph("To empower DJs with the tools, visibility, community, and commercial opportunities they need to turn their passion into sustainable lifelong careers.", card_body_style)
        ],
        [
            Paragraph("<b>BRAND PROMISE</b>", ParagraphStyle('PT', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, textColor=c_yellow)),
            Paragraph("Deck Salone gives every DJ a place to be heard, discovered, supported, and rewarded.", card_body_style)
        ]
    ]
    purpose_table = Table(purpose_data, colWidths=[130, 402])
    purpose_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_surface_dark),
        ('BOX', (0,0), (-1,-1), 1, c_card_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_card_border),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))
    story.append(purpose_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("3. Core Brand Values", section_heading))
    values_data = [
        [
            Paragraph("<b>1. Sound First</b><br/>The quality, originality, and energy of the music always come first.", card_body_style),
            Paragraph("<b>2. Opportunity</b><br/>Creating pathways for DJs to gain listeners, bookings, partnerships, and income.", card_body_style),
            Paragraph("<b>3. Community</b><br/>Bringing DJs, fans, promoters, event organizers, and music lovers together.", card_body_style)
        ],
        [
            Paragraph("<b>4. Progress</b><br/>Supporting both established veterans and raw emerging bedroom talent.", card_body_style),
            Paragraph("<b>5. Authenticity</b><br/>Celebrating Sierra Leonean identity, culture, creativity, and unique sounds.", card_body_style),
            Paragraph("<b>6. Fairness & Trust</b><br/>Transparent metric tracking, recognition, and professional credibility.", card_body_style)
        ]
    ]
    val_table = Table(values_data, colWidths=[175, 175, 182])
    val_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_surface_dark),
        ('BOX', (0,0), (-1,-1), 1, c_card_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_card_border),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP')
    ]))
    story.append(val_table)

    story.append(PageBreak())

    # ─── PAGE 3: THE 8 PLATFORM PILLARS ───────────────────────
    story.append(Paragraph("4. The 8 Pillars of the Deck Salone Platform", section_heading))
    story.append(Paragraph("Deck Salone is not just a streaming directory — it is an end-to-end creative and commercial operating system built around the complete DJ lifecycle:", body_style))
    story.append(Spacer(1, 4))
    
    pillars = [
        ("1. Deck Discover & Audio Hub", "High-performance streaming engine engineered with low-latency audio buffering, waveform visualization, instant downloads, and genre navigation across Afrobeats, Amapiano, Salone Mix, Dancehall, Hip-Hop, and Gospel."),
        ("2. Deck Profile (Electronic Press Kit)", "Standardized professional DJ press kits featuring biography, verified status, genre specialization, featured showcase mixes, stream statistics, follower counts, and direct booking triggers."),
        ("3. Deck Bookings & Direct Inquiry Engine", "Integrated booking workflow allowing club owners, wedding planners, promoters, and festival organizers to review availability, submit inquiries, and contract DJs transparently."),
        ("4. Deck Earnings & Creator Monetization", "Stream-based creator remuneration system providing transparent analytics on track plays, audience retention, fan tips, and royalty payouts."),
        ("5. Deck Rankings & Real-Time DJ Battles", "Algorithm-driven leaderboard tracking weekly streams, audience votes, and gig performance, paired with weekly head-to-head mix battles where the community votes for top talent."),
        ("6. Official Editorial Playlists & Hall of Fame", "Curated official collections highlighting trending cultural hits, alongside the prestigious Sierra Leone DJ Hall of Fame honoring legendary music pioneers."),
        ("7. Events & Digital Ticketing Portal", "Comprehensive event discovery system featuring verified event listings, secure online ticket purchasing, and on-site QR-code scanner verification tools for promoters."),
        ("8. Community Hub & Opportunity Marketplace", "Social engagement feed allowing fans to like, share, and re-up mixes, plus a promoter opportunities board for DJ casting calls and club residencies.")
    ]
    
    pillar_table_data = []
    for i in range(0, len(pillars), 2):
        p1_title, p1_desc = pillars[i]
        p2_title, p2_desc = pillars[i+1]
        pillar_table_data.append([
            Paragraph(f"<b>{p1_title}</b><br/><br/>{p1_desc}", card_body_style),
            Paragraph(f"<b>{p2_title}</b><br/><br/>{p2_desc}", card_body_style)
        ])
        
    p_table = Table(pillar_table_data, colWidths=[266, 266])
    p_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_surface_dark),
        ('BOX', (0,0), (-1,-1), 1, c_card_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_card_border),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 9),
        ('RIGHTPADDING', (0,0), (-1,-1), 9),
        ('VALIGN', (0,0), (-1,-1), 'TOP')
    ]))
    story.append(p_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph("5. Target Audiences & Ecosystem Synergy", section_heading))
    
    aud_data = [
        [
            Paragraph("<b>DJs & Creators</b>", card_title_style),
            Paragraph("<b>Music Fans & Listeners</b>", card_title_style),
            Paragraph("<b>Promoters & Venues</b>", card_title_style)
        ],
        [
            Paragraph("Professional, club, radio, mobile, and emerging bedroom DJs seeking exposure, bookings, verified credibility, and monetized streams.", card_body_style),
            Paragraph("Passionate music enthusiasts exploring authentic Sierra Leonean and African mixes, tracking weekly DJ battles, and discovering local talent.", card_body_style),
            Paragraph("Nightclub owners, festival producers, corporate planners, and promoters looking for verified, vetted, and high-performing talent.", card_body_style)
        ]
    ]
    aud_table = Table(aud_data, colWidths=[175, 175, 182])
    aud_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_surface_dark),
        ('BOX', (0,0), (-1,-1), 1, c_card_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_card_border),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP')
    ]))
    story.append(aud_table)

    story.append(PageBreak())

    # ─── PAGE 4: FOUNDER, EXPANSION & CONTACT ─────────────────
    story.append(Paragraph("6. Founder Profile — Frederick Julian Max-Macauley", section_heading))
    story.append(Paragraph(
        "<b>Frederick Julian Max-Macauley (DJ Fred Max)</b> is an entertainment entrepreneur, creative director, and platform architect. As the founder of Sound It Entertainment and Deck Salone, he recognized early on that while Sierra Leone possesses immense musical talent and a thriving nightlife culture, its creative sector suffered from fragmented offline systems, lack of royalty infrastructure, and limited international discovery channels.",
        body_style
    ))
    story.append(Paragraph(
        "Leveraging deep roots in the entertainment industry and modern software engineering, Fred Max architected Deck Salone to provide a permanent, scalable digital home for creators. His leadership unites culture, technology, and economic empowerment to position African creative talent on global stages.",
        body_style
    ))
    
    quote_data = [[
        Paragraph(
            "<i>“Deck Salone was created to give Sierra Leonean DJs more than a place to upload audio files. It was built to give them visibility, dignity, commercial opportunity, and a digital infrastructure they can truly own.”</i><br/><br/><b>— Frederick Julian Max-Macauley (Founder, Deck Salone & Sound It Entertainment)</b>",
            ParagraphStyle('QuoteText', parent=styles['Normal'], fontName='Helvetica', fontSize=9.5, leading=14, textColor=c_yellow, alignment=0)
        )
    ]]
    quote_table = Table(quote_data, colWidths=[532])
    quote_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#181B22')),
        ('BOX', (0,0), (-1,-1), 1.5, c_yellow),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 14),
        ('RIGHTPADDING', (0,0), (-1,-1), 14),
    ]))
    story.append(quote_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph("7. Geographic Footprint & Pan-African Expansion", section_heading))
    story.append(Paragraph(
        "<b>Primary Domestic Market:</b> Freetown, Bo, Kenema, Makeni, Port Loko, Waterloo, and regional communities across Sierra Leone.<br/>"
        "<b>Global Diaspora & Expansion:</b> Connecting Sierra Leonean diaspora communities in the United Kingdom, United States, Canada, Europe, and Australia, while expanding regional onboarding to Nigeria, Ghana, Liberia, and broader West Africa.",
        body_style
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph("8. Corporate Identity & Partnership Contact", section_heading))
    
    contact_data = [
        [
            Paragraph("<b>PLATFORM DESTINATION</b><br/><font color='#FFFFFF'>https://decksalone.com</font>", card_body_style),
            Paragraph("<b>OFFICIAL EMAIL</b><br/><font color='#FFFFFF'>support@decksalone.com</font>", card_body_style)
        ],
        [
            Paragraph("<b>PARENT COMPANY</b><br/><font color='#FFFFFF'>Sound It Entertainment</font>", card_body_style),
            Paragraph("<b>SOCIAL CHANNELS</b><br/><font color='#FFF559'>@DeckSalone • @SoundItEntertainment</font>", card_body_style)
        ],
        [
            Paragraph("<b>PARTNERSHIP INQUIRIES</b><br/><font color='#FFFFFF'>Brand Sponsorships, DJ Bookings & Festivals</font>", card_body_style),
            Paragraph("<b>TECHNICAL SPECIFICATIONS</b><br/><font color='#FFFFFF'>Vite React SPA, Node.js/Prisma API, PostgreSQL, Redis</font>", card_body_style)
        ]
    ]
    contact_table = Table(contact_data, colWidths=[266, 266])
    contact_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_surface_dark),
        ('BOX', (0,0), (-1,-1), 1, c_card_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_card_border),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))
    story.append(contact_table)
    story.append(Spacer(1, 16))
    
    closing_tag = Table([[
        Paragraph("<font color='#000000'><b>DECK SALONE — WHERE SIERRA LEONE DJS CONNECT, COMPETE, EARN & GROW.</b></font>", highlight_box_style)
    ]], colWidths=[532])
    closing_tag.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_yellow),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'CENTER')
    ]))
    story.append(closing_tag)

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"✅ Successfully generated PDF: {output_path}")

if __name__ == '__main__':
    logo_file = "/Users/djfredmax/Desktop/Deck Salone/app/public/deck-salone-brand-logo.png"
    pdf_dest1 = "/Users/djfredmax/Desktop/Deck Salone/app/public/downloads/Deck_Salone_About_Company_Profile.pdf"
    pdf_dest2 = "/Users/djfredmax/.gemini/antigravity/brain/25da8f21-4c5a-4849-a919-72c20c8fb00a/Deck_Salone_About_Company_Profile.pdf"
    
    os.makedirs(os.path.dirname(pdf_dest1), exist_ok=True)
    os.makedirs(os.path.dirname(pdf_dest2), exist_ok=True)
    
    build_deck_salone_pdf(pdf_dest1, logo_file)
    build_deck_salone_pdf(pdf_dest2, logo_file)
