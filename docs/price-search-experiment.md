# Price search experiment: thin cards

Run: 2026-10-25T19:04:09.116Z (from price_experiment_listings.json). Sold listings only, 240 results per page. Nothing here is priced or applied.

Stage counts are in filter order: a listing is counted at the first stage that removes it. "Fewer words" = listings eBay added below its "Results matching fewer words" divider (padding, not an exact match).

## NVIDIA GeForce RTX 3090 (`rtx-3090`), gate: 20 usable

| Variant | Query | Pages | Raw | Fewer words | Excl. term | Excl. kw | Title mismatch | Wrong variant | System | Out of range | **Usable** | Median | Range |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| baseline | `RTX 3090 24GB -(box,cooler,broken,parts,shroud,waterblock,damaged,read,pc,desktop,system,dell,alienware)` | 1 | 247 | 0 | 8 | 0 | 5 | 26 | 0 | 205 | **3** | $710 | $493–$750 |
| no-system-terms | `RTX 3090 24GB -ti -(box,cooler,broken,parts,shroud,waterblock,damaged,read)` | 1 | 247 | 0 | 8 | 0 | 5 | 0 | 0 | 230 | **4** | $750 | $600–$995 |
| minimal | `RTX 3090 -ti` | 2 | 487 | 0 | 57 | 4 | 6 | 0 | 0 | 410 | **10** | $750 | $600–$995 |
| exact-phrase | `"RTX 3090" -ti` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0** | — | — |
| geforce | `GeForce RTX 3090 24GB -ti` | 1 | 247 | 0 | 13 | 1 | 5 | 0 | 0 | 223 | **5** | $750 | $600–$1,000 |
| brands | `3090 24GB (EVGA,ASUS,MSI,Gigabyte,Zotac,Founders) -ti` | 1 | 247 | 0 | 16 | 2 | 5 | 0 | 0 | 221 | **3** | $750 | $710–$1,000 |
| combined | `all non-baseline variants, each eBay item counted once` | — | 489 | 0 | 57 | 5 | 7 | 0 | 0 | 410 | **10** | $750 | $600–$995 |

Combined: 10 usable (gate 20: NOT reached).

<details><summary>Combined: usable titles, and titles removed as wrong variant / complete system / title mismatch</summary>

Usable:
- $750 ZOTAC NVIDIA GeForce RTX 3090 Trinity 24GB GDDR6X Graphics Card ZT-A30900D-10P
- $600 New ListingPNY GeForce RTX 3090 XLR8 Gaming EPIC-X RGB Triple Fan Edition P 24GB GDDR6X...
- $710 EVGA HYBRID NVIDIA GeForce RTX 3090 24GB Liquid Cooled VERY DIRTY
- $995 DELL GeForce RTX 3090 24GB RAM - Graphics Card - Great Condition
- $880 Nvidia Gigabyte Aorus Xtreme RTX 3090
- $599.99 ASUS ROG Strix NVIDIA GeForce RTX 3090 OC 24GB GDDR6X Triple Fan HDMI 2.1 Tested
- $640 EVGA GeForce RTX 3090 FTW3 Ultra RGB Multi-Monitor Fan/Heatsink w/ Box
- $995 DELL GeForce RTX 3090 24GB RAM - Graphics Card - Great Condition
- $755 EVGA GeForce RTX 3090 FTW3 24GB GDDR6X CUDA PCIe HDMI/DP Multi-Monitor
- $600 NVIDIA GeForce RTX 3090 Founders Edition 24GB GDDR6 Graphics Card -...

Removed as title-mismatch:
- $1,825 Apple MacBook Pro 16” M4 Pro 48GB 1TB SSD 20-Core GPU Silver Z1FP000C6LL/A 2024
- $35 Disney mystery bundle box!
- $10 Disney Light Side Vs Dark Side Mystery Pin Palpatine Star Wars
- $19.95 Disney Parks 2026 Star Wars Light Side Vs Dark Side Mystery Box Pin (You Choose)
- $17.98 YOU PICK Disney Parks Star Wars LIGHT SIDE VS DARK SIDE Mystery Pin COMBINE SHIP
- $31.99 Thermaltake Smart 500W 80 PLUS ATX Power Supply PSU Black SPD-0500AH2NCW
- $459.99 DELL NVIDIA GeForce RTX 3080 10GB GDDR6 Graphic Card

</details>

## NVIDIA GeForce RTX 4090 (`rtx-4090`), gate: 15 usable

| Variant | Query | Pages | Raw | Fewer words | Excl. term | Excl. kw | Title mismatch | Wrong variant | System | Out of range | **Usable** | Median | Range |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| baseline | `RTX 4090 24GB -(box,cooler,broken,parts,shroud,waterblock,damaged,read,pc,desktop,system)` | 1 | 247 | 0 | 9 | 0 | 5 | 1 | 0 | 225 | **7** | $1,550 | $1,500–$1,800 |
| no-system-terms | `RTX 4090 24GB -(box,cooler,broken,parts,shroud,waterblock,damaged,read)` | 1 | 247 | 0 | 9 | 0 | 5 | 1 | 0 | 225 | **7** | $1,550 | $1,500–$1,800 |
| minimal | `RTX 4090` | 2 | 487 | 0 | 47 | 4 | 397 | 0 | 0 | 39 | **0** | — | — |
| exact-phrase | `"RTX 4090"` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0** | — | — |
| geforce | `GeForce RTX 4090 24GB` | 1 | 247 | 0 | 19 | 0 | 6 | 0 | 0 | 216 | **6** | $1,700 | $1,500–$2,000 |
| brands | `4090 24GB (ASUS,MSI,Gigabyte,Zotac,PNY,Founders)` | 1 | 247 | 0 | 25 | 1 | 5 | 1 | 0 | 208 | **7** | $1,550 | $1,500–$1,800 |
| combined | `all non-baseline variants, each eBay item counted once` | — | 723 | 0 | 71 | 5 | 398 | 1 | 0 | 241 | **7** | $1,550 | $1,500–$1,800 |

Combined: 7 usable (gate 15: NOT reached).

<details><summary>Combined: usable titles, and titles removed as wrong variant / complete system / title mismatch</summary>

Usable:
- $1,550 MSI GeForce RTX 4090 GAMING TRIO 24G 24GB PCIe x16 Triple Fan Silent
- $2,000 GIGABYTE GeForce RTX 4090 WINDFORCE V2 24GB GDDR6X HDMI/DP PCIe
- $1,500 ASUS NVIDIA GeForce RTX 4090 24gb RAM
- $1,800 MSI GeForce RTX 4090 Graphics Card - 24GB GDDR6X, 2550 MHz, PCI Express Gen 4, 3
- $1,700 GIGABYTE NVIDIA GeForce RTX 4090 Gaming OC 24GB Ray Tracing DLSS 3
- $1,500 ZOTAC NVIDIA GeForce RTX 4090 Trinity OC 24GB GDDR6X RGB Dual BIOS PCIe
- $1,100 GIGABYTE GeForce RTX 4090 WINDFORCE V2 24GB GDDR6X HDMI/DP PCIe x16

Removed as wrong-variant:
- $1,649.94 ASUS RTX 3090 Ti 24GB STRIX LC Liquid Cooled as new condition not 4090 5090 5080

Removed as title-mismatch:
- $1,825 Apple MacBook Pro 16” M4 Pro 48GB 1TB SSD 20-Core GPU Silver Z1FP000C6LL/A 2024
- $35 Disney mystery bundle box!
- $10 Disney Light Side Vs Dark Side Mystery Pin Palpatine Star Wars
- $19.95 Disney Parks 2026 Star Wars Light Side Vs Dark Side Mystery Box Pin (You Choose)
- $17.98 YOU PICK Disney Parks Star Wars LIGHT SIDE VS DARK SIDE Mystery Pin COMBINE SHIP
- $1,639 New ListingNVIDIA GeForce RTX 3090 Founders Edition FE 24GB GDDR6X Graphics Card
- $349.99 *Read* MSI GeForce RTX 4070 Ti Super 16G Ventus 3X GDDR6X GPU No work
- $300 GIGABYTE GeForce RTX 3070 Ti GAMING OC 8GB GDDR6X Graphics Card
- $315 GIGABYTE GeForce RTX 3070 Ti Gaming OC 8G Graphics Card WINDFORCE 3X Cooling
- $1,659.99 Galax BOOMSTAR GeForce RTX 3090 24GB RAM - Graphics Card - Very Good Condition
- $350 Gigabyte AORUS Master NVIDIA GeForce RTX 3070Ti 8GB GDDR6X PCI Express 3.0
- $319 New ListingNVIDIA GeForce RTX 3070 Ti Founders Edition 8GB GDDR6X DirectX HDMI/DP
- $610 EVGA GeForce RTX 3080 Ti FTW3 ULTRA GAMING 12GB GDDR6X Graphics Card
- $425 New ListingASUS ROG Strix GeForce RTX 3080 OC 10GB GDDR6X Graphics Card
- $400 New ListingASUS Dual OC GeForce RTX 4070 Super 12GB - Graphics Card - Used - Good condition
- $660 New ListingGigabyte GeForce RTX 4070Ti  WINDFORCE OC 12G  GV-N407TWF3OC-12GD GPU
- $1,549 EVGA GeForce RTX 3090 FTW3 ULTRA GAMING 24GB GDDR6X Graphics Card
- $485 EVGA GeForce RTX 3080 Ti XC3 ULTRA GAMING 12GB GDDR6X Graphics Card
- $685 MSI Ventus GeForce RTX 5060 Ti 16GB GDDR7 PCI Express 5.0 x 16 (use x8) ATX Grap
- $625 New ListingASUS Dual OC GeForce RTX 4070 12GB RAM - Graphics Card
- $499.99 ASUS ROG Strix GeForce RTX 3080 OC 10GB GDDR6X Graphics Card
- $1,900 NVIDIA GeForce RTX 3090 Founders Edition 24GB GDDR6X - New Never Used
- $750 New ListingZOTAC GAMING GeForce RTX 4070 Ti Trinity OC 12GB GDDR6X Graphics Card
- $1,099 MSI Gaming X Trio GeForce RTX 4080 16GB GDDR6X RGB Graphics Card
- $5,900 NVIDIA GeForce RTX 5090 32GB Founders Edition - Excellent with Original Box
- $1,200 ASUS TUF Gaming GeForce RTX 4080 SUPER 16GB GDDR6X OC Graphic Card -USED
- $1,629 EVGA NVIDIA GeForce RTX 3090 XC3 24GB GDDR6X Graphics Card - Barely Used
- $239.99 GIGABYTE RTX 5060 OC 8GD Graphics Card GPU GV-N5060GAMING OC-8GD *Not Work*
- $1,399 Asus ROG Strix GeForce RTX 3090 24GB Graphics Card
- $1,399 EVGA GeForce RTX 3090 FTW3 24GB Graphics Card
- $2,199 GIGABYTE GeForce RTX 3090 TURBO 24GB GDDR6X Graphics Card
- $1,789.99 GIGABYTE TURBO GeForce RTX 3090 24GB RAM - Graphics Card - Excellent Condition
- $1,500 MSI NVIDIA GeForce RTX 3090 VENTUS 3X 24G OC Edition Graphics Card
- $1,249.99 Mint ASUS ROG STRIX NVIDIA GeForce RTX 4080 16GB GDDR6X Gaming Graphics Card
- $1,500 New ListingDELL ALIENWARE OEM NVIDIA GeForce RTX 3090 24GB GDDR6 Graphics Card
- $1,659.99 Dell NVIDIA GeForce RTX 3090 24GB GDDR6X Dual Fan Alienware OEM M8HMD
- $419.97 PNY Nvidia RTX 3080 10GB Graphics Card GPU Desktop
- $669 New ListingASUS TUF Gaming RTX 4070 Ti SUPER OC 16GB GDDR6X DLSS 3 HDMI/DP RGB
- $500 VENTUS 2X GEFORCE 5060TI MSI  NEW WHITE PLUS
- $295 MSI GeForce RTX 3070 GAMING X TRIO 8GB GDDR6X Graphics Card
- $450 New ListingPNY GeForce RTX 4070 XLR8 VERTO EPIC-X Triple Fan 12GB GDDR6X Graphics Card
- $1,599.99 EVGA GeForce RTX 3090 FTW3 Ultra 24GB GDDR6X Graphics Card 24G-P5-3987-KR
- $1,699 NVIDIA GeForce RTX 3090 24GB GDDR6X Founders Edition 900-1G136-2510-000
- $1,649 GIGABYTE NVIDIA GeForce RTX 3090 24GB GDDR6X GAMING OC GV-N3090GAMING OC-24GD
- $599 NVIDIA GeForce RTX 4070 12GB GDDR6X PCIe x16 CUDA Multi-Monitor
- $299 MSI GeForce RTX 3070 GAMING X TRIO 8GB GDDR6X Graphics Card
- $305 New ListingMSI NVIDIA GeForce RTX 3070 Ti Aero 8GB GDDR6X Graphics Card
- $759.99 Gigabyte GeForce RTX 4070 Founders Edition FE 12GB GDDR6X Graphics Card PG141C
- $1,499 ASUS ROG Strix NVIDIA GeForce RTX 3090 OC 24GB VRAM GDDR6X Graphics Card
- $349.98 EVGA Nvidia RTX 3070 Ti FTW3 ULTRA GAMING 8GB GDDR6X Graphics Card GPU
- $600 New ListingPNY GeForce RTX 4070 Ti XLR8 Gaming VERTO EPIC-X RGB OC Triple Fan 12GB
- $749.99 MSI NVIDIA GeForce RTX 5060 Ti Shadow 2X OC 16GB GDDR7 Graphics Card / Brand New
- $439 New ListingASUS ROG Strix RTX 3080 OC 10GB V2 LHR GDDR6X Graphics Card - Tested Working
- $389 New ListingZOTAC GAMING GeForce RTX 3080 AMP HoloBlack 10GB GDDR6X - NON LHR
- $1,200 MSI GeForce RTX 4080 SUPER 16G VENTUS 3X OC 16GB GDDR6X Graphics Card Excellent
- $750 ZOTAC NVIDIA GeForce RTX 3090 Trinity 24GB GDDR6X Graphics Card ZT-A30900D-10P
- $395 New ListingDell GeForce RTX 3080 10GB GDDR6X Graphics Card Tested Working
- $400.99 MSI GeForce RTX 5060 8GB Shadow 2X OC GDDR7 Graphics Card
- $459.99 New ListingMSI GeForce RTX 3080 Ti Ventus 3X OC 12GB GDDR6X Graphics Card G308TV3X12C
- $614.99 NVIDIA GeForce RTX 3080 Ti Founders Edition 12GB GDDR6X Graphics Card
- $450 EVGA RTX 3080 FTW3 ULTRA GAMING 10GB Graphics Card (Excellent Condition)
- $1,729.99 GIGABYTE GeForce RTX 3090 TURBO 24G 24GB GDDR6X DLSS Ray Tracing
- $300 MSI GeForce RTX 3080 Ti Gaming x Trio 12GB GDDR6X Graphics Card
- $550 GIGABYTE GeForce RTX 3080 Ti GAMING OC 12GB GDDR6X Graphics Card
- $1,170 New ListingEVGA GeForce RTX 3090 FTW3 24GB GDDR6X RGB Triple Fan Graphics Card
- $516 New ListingNVIDIA GeForce RTX 3080 Ti Founders Edition 12GB GDDR6X Graphics Card
- $550 New ListingNVIDIA GeForce RTX 5060 Ti  2X OC 16GB GDDR7 Graphics Card
- $379.99 EVGA GeForce RTX 3070 Ti XC3 ULTRA GAMING 8GB GDDR6X Graphics Card Open Box
- $7,000 New ListingNVIDIA GeForce RTX 5090 FE Founders Edition 32GB Graphics Card CIB
- $1,329 NVIDIA GeForce RTX 3090 Founders Edition 24GB GDDR6 Card Fan Need Replace Works
- $1,000 New ListingEVGA GeForce RTX 3090 Ti FTW3 ULTRA GAMING 24GB GDDR6X Graphics Card
- $349.99 New ListingMSI GeForce RTX 3080 GAMING X TRIO 10GB GDDR6X Graphics Card
- $300 MSI GeForce RTX 3070 Ti VENTUS 3X OC 8GB GDDR6X Graphics Card
- $900 GIGABYTE AERO OC 16G GeForce RTX 4070 Ti SUPER 16GB GDDR6X RGB
- $1,500 EVGA NVIDIA GeForce RTX 3090 FTW3 Ultra 24GB GDDR6X Graphics Card 24G-P5-3987-KR
- $949.99 N91849-001 HP Nvidia GeForce RTX 4070 TI SUPER OC 16GB GDDR6X PCIe 4.0
- $1,499 EVGA NVIDIA GeForce RTX 3090 FTW3 24GB GDDR6X RGB PCIe HDMI/DP
- $320 AORUS NVIDIA GeForce RTX 3070 Ti MASTER 8G 8GB GDDR6X RGB PCIe 4.0
- $1,680 MSI GeForce RTX 5070 Ti 16GB GAMING TRIO OC WHITE GDDR7 Graphics Card 4K Gaming
- $579.99 MSI GeForce RTX 3080 Ti VENTUS 3X OC 12GB GDDR6X Graphics Card
- $1,470 ASUS ROG Strix NVIDIA GeForce RTX 3090 OC Edition 24GB GDDR6X VRAM Graphics Card
- $1,599 Dell NVIDIA GeForce RTX 3090 24GB GDDR6X Graphics Card - Used Condition
- $437 EVGA GeForce RTX 3080 XC3 ULTRA GAMING 10GB GDDR6X (10G-P5-3885-KL)
- $1,499 EVGA NVIDIA GeForce RTX 3090 FTW3 Ultra 24GB GDDR6X Graphics Card 24G-P5-3987-KR
- $600 New ListingPNY GeForce RTX 3090 XLR8 Gaming EPIC-X RGB Triple Fan Edition P 24GB GDDR6X...
- $1,526 GIGABYTE AORUS GeForce RTX 3090 Xtreme Waterforce 24GB GDDR6X PCIe 4.0 LED
- $656 EVGA GeForce RTX 3080 Ti FTW3 Ultra 12GB GDDR6X RGB Graphics Card with box
- $450 New Listing—ARTIFACTS— GALAX GeForce RTX 4070 Ti SUPER EX Gamer V2 16GB GDDR6X HDMI/DP
- $2,199.97 Gigabyte GeForce RTX 3090 24GB Turbo Blower GPU / 1yr Warranty, Fast Ship!
- $1,599 NVIDIA GeForce RTX 3090 Founders Edition 24GB GDDR6X GPU Tested w/ Power Adapter
- $283.99 ASUS TUF Gaming RTX 3070 OC 8GB GPU Tested Working Cosmetic Wear
- $449 NVIDIA GeForce RTX 3080 Founders Edition 10GB GDDR6X Graphics Card -...
- $1,000 GE FORCE RTX 4080 Founders edition
- $420 MSI RTX 3080 SUPRIM X 10GB GDDR6X Graphics Card Tested
- $1,400 ASUS ROG Strix GeForce RTX 4080 SUPER OC 16GB GDDR6X
- $1,750 New ListingASUS TUF Gaming GeForce RTX 3090 OC 24GB GDDR6x
- $739.99 Gigabyte GeForce RTX 4070 Super OC 12GB GDDR6X (GV-N407SWF3OC-12GD)
- $847 Gently used MSI Gaming RTX 4070 Ti Super 16GB Gaming X Slim 1440p champion
- $975 ASUS ProArt NVIDIA GeForce RTX 4080 16GB GDDR6X Graphics Card
- $990 RTX 4080 SUPER 16GB ASUS TUF OC GAMING - USED TESTED, LOW DUST, 12 PIN
- $529 GIGABYTE GeForce RTX 4070 WINDFORCE OC 12GB GDDR6X Graphics Card
- $1,750 ASUS TUF Gaming GeForce RTX 3090 OC 24GB GDDR6x
- $424.95 ASUS TUF Gaming NVIDIA RTX 3080 10GB Graphics Card video GPU W/ 30days warranty
- $1,499 NVIDIA GeForce RTX 3090 Founders Edition 24GB GDDR6X Graphics Card
- $900 MSI GeForce RTX 4070 SUPER Gaming X Slim 12GB GDDR6X Graphics Card
- $649.5 NVIDIA GeForce RTX 3080 Ti Founders Edition 12GB GDDR6X Graphics Card
- $374.99 Gigabyte GeForce RTX 3080 Turbo 10GB GDDR6X Graphics Card
- $1,499 MSI GeForce RTX 3090 GAMING X TRIO 24GB GDDR6X Graphics Card TESTED AND WORKING
- $1,599 MSI GeForce RTX 3090 Gaming X Trio 24GB GDDR6X Graphics Card
- $1,565 EVGA RTX 3090 FTW3 ULTRA 24GB GDDR6X Graphics Card...PRE OWNED FREE SHIPPING!
- $818 OEM NVIDIA Gefoce RTX 3080 20GB Turbo GPU GDDR6X PCIe 4.0 x16 Graphics Card
- $1,500 EVGA GeForce RTX 3090 Ti FTW3 BLACK GAMING 24GB GDDR6X Graphics Card
- $788.98 1PC NVIDIA Gefoce RTX 3080 20GB Turbo GPU GDDR6X PCIe 4.0 x16 Graphics Card
- $7,499.99 🔥ASUS RTX 5090 ROG Astral OC 32GB NVIDIA GeForce - New Sealed - Free Shipping!
- $1,000 NVIDIA GeForce RTX 4080 Founders Edition
- $1,629 ZOTAC GeForce RTX 3090 24GB GDDR6X Trinity OC Graphics Card
- $449.99 GIGABYTE GeForce RTX 3080 GAMING OC 10GB 3X GV-N3080GAMING OC-10GD Rev 2.0
- $1,249.73 NEW Gigabyte RTX 5070 Ti WINDFORCE SFF 16GB GDDR7 [SEALED] [3-Year Warranty]
- $899.99 NVIDIA GeForce RTX 4080 16GB GDDR6X Graphics Card
- $1,159.99 ASUS TUF Gaming GeForce RTX 4070 Ti Super 16GB OC TUF-RTX4070TIS-O16G-GAMING
- $625 NVIDIA GeForce RTX 4070 Founders Edition 12GB Graphics Card With Original Box
- $1,639.99 DELL Alienware GeForce RTX 3090 24GB RAM - Graphics Card - Very Good Condition
- $1,799.99 NVIDIA GeForce RTX 3090 Ti Founders Edition FE 24GB GDDR6X Graphics Card PG136C
- $1,699 ASUS NVIDIA GeForce RTX 3090 24 GB GDDR6X ['ROG-STRIX-RTX3090-O24G-WHITE']
- $325 GIGABYTE GeForce RTX 3070 Ti VISION OC 8GB GDDR6X White Graphics Card
- $574.99 Zotac RTX 4070 Super Twin Edge 12GB GDDR6X Graphics Card 9288-5N710-201Z8
- $1,749 GIGABYTE GeForce RTX 3090 24GB GDDR6X TURBO Blower Edition
- $259.99 Gigabyte GeForce RTX 3060 Ti Eagle OC 8GB GDDR6X Graphics Card GV-N306TXEAGLE
- $699.99 Gigabyte GeForce RTX 4070 Eagle OC Triple Fan 12GB GDDR6X PCIe 4.0 Graphic Card
- $542.74 ASUS GeForce RTX 4070 Super OC 12GB Graphics Card (DUAL-RTX4070S-012G)
- $1,429.47 EVGA GeForce RTX 3090 FTW3 ULTRA GAMING 24GB GDDR6X Graphics Card
- $1,599.99 ZOTAC Trinity GeForce RTX 3090 24GB RAM - GPU - Very Good w/ Missing Fan Logos
- $575 ASUS Dual GeForce RTX 4070 White OC 12GB GDDR6X PCIe DP/HDMI HDCP
- $1,699 MSI SUPRIM NVIDIA GeForce RTX 24GB GDDR6X Liquid Cooled LED GPU
- $1,528 EVGA RTX 3090 FTW3 ULTRA 24GB RAM GDDR6X Graphics Card ARGB LED 24G-P5-3987-KR
- $900 Msi Ventus 3x Geforce Rtx 4080 Super
- $2,352.78 NVIDIA GeForce RTX 3090 24GB GDDR6X 2SLOT Turbo GPU Graphics Card blower type
- $598.84 MSI GeForce RTX 3080 TI VENTUS 3X 12G Graphics Card - Scratch & Dent
- $930 Dell NVIDIA GeForce RTX 4080 16GB GDDR6X Graphics Card, 3X DP, 1X HDMI
- $160 ASUS TUF Gaming NVIDIA GeForce RTX 12GB GDDR6X RGB HDMI/DP PCIe x16
- $1,137.15 MicroStar/MSI Nvidia GeForce RTX 4080 Ventus 3X Graphics Card - G408016V3X
- $1,450 ZOTAC RTX 4080 SUPER Trinity Black 16GB GDDR6X GPU - NEW + SEALED RETAIL BOX
- $699.99 GALAX GeForce RTX 4070 Ti EX Gamer White V2 12GB GDDR6X RGB DLSS 3
- $1,599 ZOTAC GAMING GeForce RTX 3090 Trinity OC 24GB GDDR6X Graphics Card - Excellent
- $680 GIGABYTE RTX 4070 Ti 12GB GDDR6X Graphics Card
- $1,125 NVIDIA GeForce RTX 4080 Founders Edition 16GB GDDR6X Graphics Card
- $444.26 Open Box 8GB nVIDIA RTX 3070 TI Founders Edition PCI-E 4.0 900-1G143-2515-000
- $123.9 GIGABYTE GeForce RTX 3080 Ti EAGLE 12GB GDDR6X
- $400 NVIDIA GeForce RTX 3080 Founders Edition 10GB GDDR6X Graphics Card -...
- $850 GIGABYTE GeForce RTX 4080 GAMING OC 16GB GDDR6X Graphics Card
- $1,195.42 ASUS TUF Gaming GeForce RTX™ 4070 Ti SUPER 16GB GDDR6X OC Edition Graphics Card
- $1,575 NVIDIA GeForce RTX 3090 Ti 24GB GDDR6X - 9001G1362505000
- $370 ZOTAC GeForce RTX 3080 Trinity OC LHR 10GB GDDR6X Graphics Card Black
- $1,523 evga rtx 3090 xc3
- $1,499 Gigabyte NVIDIA GeForce RTX 3090 Vision 24GB GDDR6X Graphics Card GPU LNIB Mint
- $529.99 EVGA FTW3 Ultra GeForce RTX 3080 10GB RAM - Graphics Card - Excellent Condition
- $1,399 ASUS TURBO RTX3090 24GB GDDR6X 384bit Graphics card
- $924.99 Lenovo NVIDIA GeForce RTX 4070 Ti SUPER Dedicated Graphics Card GPU 16GB GDDR6X
- $592 EVGA NVIDIA GeForce RTX 3080 Ti FTW3 12GB GDDR6X HDMI PCIe x16
- $420 EVGA NVIDIA GeForce RTX 3080 XC3 Ultra Gaming 10GB GDDR6X PCIe 4.0 Graphics Card
- $499.99 Gigabyte GeForce RTX 3080 Ti Vision 12GB GDDR6X Graphics Card GV-N307TVISION
- $1,499 EVGA NVIDIA GeForce RTX 3090 FTW3 Ultra 24GB GDDR6X Graphics Card 24G-P5-3987-KR
- $9,999.99 MSI GeForce RTX 5090 Lightning Z 32GB Liquid Cooled SHIPS N 1 DAY OPEN BOX #1064
- $705.75 Zotac Gaming GeForce RTX 4070 Super Trinity DC Edition;DLSS 3;DirectX12 Ultimate
- $850 Gigabyte GeForce RTX 4070 Ti AERO OC 12GB
- $999.99 Asus GeForce RTX 4080 TUF Gaming 16GB GDDR6X Graphics Card 221214235102531
- $699 ZOTAC GeForce RTX 4070 SUPER Twin Edge 12GB GDDR6X Graphics Card - Excellent
- $449 PNY VCG407012TFXXPBW1 NVIDIA GeForce RTX 4070 12GB GDDR6X PCI Express 4.0
- $370 EVGA GeForce RTX 3080 XC3 Triple Fan 10GB GDDR6X RGB Graphics Card
- $1,499.99 EVGA GeForce RTX 3090 FTW3 24GB GDDR6X CUDA RGB Graphics Card
- $1,700 GIGABYTE AORUS GeForce RTX 4080 XTREME WATERFORCE 16GB GDDR6X Graphics Card
- $399.99 Dell GeForce RTX 3080 10GB GDDR6X Graphics Card
- $399.99 PNY GeForce RTX 5060 OC 8GB GDDR7 Dual Fan GPU VCG50608DFXPBW1-O
- $1,399 EVGA GeForce RTX 3090 FTW3 ULTRA HYBRID 24GB GDDR6X Graphic Card with air cooler
- $320 ASUS NVIDIA GeForce RTX 3060Ti Dual OC 8GB GDDR6X Video Graphics Card - White
- $1,275 MSI GeForce RTX 5070 Ti 16GB SHADOW 3X OC GDDR7 PCI Express Gen 5 x16 video card
- $310 ASUS ROG Strix GeForce RTX 3080 OC 10GB GDDR6X Graphics Card
- $1,185 NVIDIA GeForce RTX 3090 24GB GDDR6X CUDA PCIe x16 Multi-Monitor
- $499.99 NVIDIA GeForce RTX 3080 Ti Founders Edition FE 12GB GDDR6X Graphics Card PG133A
- $1,610 MSI Gaming X Trio NVIDIA GeForce RTX 3090 24GB GDDR6X DLSS HDMI RGB
- $1,500 3090 ftw3 ultra gaming 24gb
- $1,999.99 NVIDIA GeForce RTX 5080 Founders Edition FE 16GB GDDR7 Graphics Card
- $1,499 EVGA FTW3 Ultra GeForce RTX 3090 24GB - Graphics Card No Issues
- $1,799.99 NVIDIA GeForce RTX 3090 Ti 24GB GDDR6X Founders Edition
- $1,699 MSI GeForce RTX 3090 Ti GAMING X TRIO 24GB GDDR6X Graphics Card- Excellent
- $350 EVGA GeForce RTX 3070 Ti FTW3 ULTRA GAMING 8GB GDDR6X Graphics Card...
- $1,549 EVGA GeForce RTX 3090 FTW3 Ultra 24GB GDDR6X Graphics Card GPU - Tested w/ Box
- $1,696.07 EVGA GeForce RTX 3090 FTW3 ULTRA GAMING 24GB GDDR6X Graphics Card
- $599.99 Gigabyte GeForce RTX 4070 Windforce OC 12GB GDDR6X Graphics Card GV-N4070WF3OC
- $619.99 Zotac GeForce RTX 4070 Ti TRINITY OC 12GB GDDR6X Graphics Card ZT-D40710J-10P
- $389.99 Asus GeForce RTX 3080 TUF Gaming OC 10GB GDDR6X Graphics Card
- $650 GIGABYTE AORUS GeForce RTX 3080 Ti 12GB GDDR6X PCI Express 4.0 ATX Graphics Card
- $1,523 EVGA GeForce RTX 3090 24GB XC3 Ultra 24G-P5-3975-KB
- $419.99 EVGA GeForce RTX 3070 Ti FTW3 ULTRA GAMING 8GB GDDR6X Graphics Card...
- $259.99 NVIDIA GeForce RTX 3070 Ti Founders Edition FE 8GB GDDR6X
- $1,499 EVGA GeForce RTX 3090 XC3 Ultra 24GB GDDR6X GPU 24G-P5-3975-KB Box
- $449.99 MSI GeForce RTX 3080 Ventus 3X Plus OC LHR 10GB GDDR6X Graphics Card
- $275 NVIDIA GeForce RTX 3070 Ti Founders Edition 8GB GDDR6X Graphics Card
- $1,025 PNY GeForce RTX 4080 SUPER 16GB VERTO OC Triple Fan GDDR6X Graphics Card  D04
- $1,438.98 ZOTAC NVIDIA GeForce RTX 3090 Trinity 24GB GDDR6X Graphics Card ZT-A30900D-10P
- $1,460 NVIDIA GeForce RTX 3090 Founders Edition 24GB GDDR6 Graphics Card -...
- $334.99 EVGA 3070 Ti FTW3 ULTRA
- $999.99 MSI GeForce RTX 4080 Ventus 3X OC 16GB GDDR6X Graphics Card V511-009R
- $750 MSI GeForce RTX 4070 Ti VENTUS 3X OC 12GB GDDR6X Graphics Card
- $1,219.99 MSI Ventus 3X OC GeForce RTX 4080 Super 16GB - Graphics Card - Very Good
- $430 GIGABYTE NVIDIA GeForce RTX Turbo Edition 10GB GDDR6X CUDA PCIe x16 Blower GPU
- $2,100 24Gb Msi Rtx 3090 Suprimx X Pci-E 4.0 X16 Card Rtx-3090-Suprim-X-24G
- $339.99 NVIDIA GeForce RTX 3070 Ti Founders Edition 8GB GDDR6X Graphics Card w/ Box FE
- $439.99 EVGA GeForce RTX 3080 FTW3 Ultra 10GB GDDR6X Graphics Card 10G-P5-3897-KR
- $399 MSI NVIDIA GeForce RTX 3080 AERO 10G GDDR6X RAM Gaming AI Graphics Card GPU
- $949.99 ZOTAC Gaming GeForce RTX 4080 16GB AMP Extreme AIRO NVIDIA - Very Good Condition
- $1,449.99 EVGA GeForce RTX 3090 FTW3 ULTRA GAMING 24GB GDDR6X Graphics Card...
- $1,549.99 EVGA GeForce RTX 3090 Ultra 24GB GDDR6X Graphics Card WITH BOX
- $1,400 ASUS TUF Gaming NVIDIA RTX 3090 Ti OC – 24GB GDDR6X Graphics Card
- $674.95 NVIDIA GeForce RTX 3080 Ti Founders Edition 12GB GDDR6X Graphics Card
- $715 ASUS TUF Gaming NVIDIA GeForce RTX 4070 ti 12GB-GDDR6X Triple Fan PCIe-4.0
- $609.56 PNY VCG50608DFXPB1O OC Dual-Fan RTX 5060 8GB Graphics Card
- $749.97 Nvidia GeForce RTX 3080 Ti 12GB Founders Edition GPU / 1yr Warranty, Fast Ship!
- $1,400 MSI NVIDIA GeForce RTX 3090 Ventus 24GB GDDR6X Graphics Card
- $870 ASUS TUF Gaming GeForce RTX 4080 OC 16GB GDDR6X Graphics Card
- $1,500 Gigabyte 3090  GDDR6X Graphics Card GPU
- $1,799 PNY Overclocked Triple Fan GeForce RTX 5080 16GB - Graphics Card - NEW & SEALED
- $570 MSI GeForce RTX 3080 Ti GAMING X TRIO 12G 12GB GDDR6X CUDA HDMI/DP
- $325 GIGABYTE AORUS Master GeForce RTX 3070 Ti 8GB GDDR6X
- $1,600 NVIDIA GeForce RTX 3090 Founders Edition 24GB GDDR6 Graphics Card - Titanium
- $459.99 ASUS ROG Strix Gaming OC GeForce RTX 3080 10GB - Graphics Card - Very Good
- $1,500 EVGA NVIDIA GeForce RTX 3090 FTW3 Ultra 24GB GDDR6X Graphics Card 24G-P5-3987-KR
- $439 LEADTEK Nvidia RTX 3080 10G GDDR6X RAM HYPER BRAIN Gaming AI Graphics Card GPU
- $395 PNY XLR8 RTX 3080 10Gb GDDR6X UPRISING EPIC-X Triple Fan Graphics Card
- $867.82 GIGABYTE For Nvidia RTX 3080 20GB GDDR6X Server GPU AI model Graphics Card
- $1,799 MSI GeForce RTX 3090 GAMING X TRIO 24GB GDDR6X Graphics Card w/Warranty NEW
- $1,520 EVGA GeForce RTX 3090 FTW3 ULTRA 24GB GDDR6X Graphics Card
- $600 Gigabyte NVIDIA GeForce RTX 4070 Windforce 3x OC 12GB
- $339.99 RTX 3080 FOUNDERS EDITION Good Condition With Cable - 100% Working
- $699.99 NVIDIA GeForce RTX 4070 SUPER Founders Edition 12GB - GPU / No Factory Box
- $501.4 Open Box 10GB Gigabyte Rtx 3080 Gaming OC PCI-E GV-N3080GAMING OC-10GD
- $154.99 EVGA GeForce RTX 3070 Ti FTW3 ULTRA GAMING 8GB GDDR6X GPU
- $420 EVGA GeForce RTX 3070 Ti FTW3 Ultra 8GB GDDR6X RGB HDMI/DP PCIe
- $700 MSI NVIDIA RTX 4080 16GB GDDR6X VENTUS 3X OC DESKTOP GRAPHICS CARD
- $1,299.99 ASUS TUF NVIDIA RTX 4080 SUPER 16GB GDDR6X DESKTOP GRAPHICS CARD *PTM RE-PASTE*
- $1,700 Gigabyte GeForce RTX 3090 Turbo 24GB GDDR6X Blower GPU GV-N3090TURBO-24GD
- $689.99 Gigabyte NVIDIA RTX 4070 Super OC Windforce Graphic Card 12GB
- $380 EVGA GeForce RTX 3080 FTW3 ULTRA GAMING 10GB GDDR6X Graphics Card...
- $1,025 ASUS TUF Gaming GeForce RTX 4080 OC 16GB GDDR6X Graphics Card
- $1,100 ZOTAC GAMING GEFORCE RTX 4080 SUPER 16GB TRINITY BLACK ED 256BIT GDDR6X GPU
- $1,600 ASUS TUF Gaming NVIDIA GeForce RTX 3090 OC 24GB GDDR6X
- $1,525 MSI GeForce RTX 3090Ti GAMING X TRIO 24G Graphics Card GPU MS-V509 VER 1.0  D15
- $525 HP Nvidia GeForce RTX 3080 Ti 12GB Graphics Card GPU
- $1,775 NVIDIA GeForce RTX 3090 Founders Edition 24GB GDDR6 Graphics Card -...
- $449.99 ASUS ROG Strix GeForce RTX 3080 OC 10GB GDDR6X Graphics Card
- $430 GIGABYTE NVIDIA GeForce RTX Turbo Edition 10GB GDDR6X CUDA PCIe x16 Blower GPU
- $499 AORUS RTX 3080 Gaming Box Water Cooled external GPU eGPU
- $689.97 EVGA GeForce RTX 3080 Ti 12GB FTW3 Ultra 12G-P5-3967-KR / 1yr Warranty, Fast ...
- $1,447 NVIDIA GeForce RTX 3090 24GB GDDR6X Graphics Card – NEW OPEN BOX – NEVER POWERED
- $0.01 ASUS TUF Gaming NVIDIA GeForce RTX 3090 24GB GDDR6X Triple Fan GPU
- $1,499 EVGA FTW3 Ultra GeForce RTX 3090 24GB - Graphics Card Tested
- $1,571 NVIDIA GeForce RTX 3090 Founders Edition 24GB GDDR6X Graphics Card -...
- $719.99 ZOTAC Gaming GeForce RTX 4070 Super Twin Edge 12GB 192BIT GDDR6X GPU Video Card
- $395 PNY XLR8 RTX 3080 10Gb GDDR6X UPRISING EPIC-X Triple Fan Graphics Card
- $1,799 NVIDIA GeForce RTX 3090 Ti 24GB GDDR6X Founders Edition 900-1G136-2505-RF2
- $1,350 DELL Alienware GeForce RTX 3090 24GB RAM - Nvidia - Graphics Card - GPU
- $394 EVGA GeForce RTX 3080 FTW3 Ultra Gaming 10GB GDDR6X GPU 10G-P5-3897-KL
- $1,450 EVGA GeForce RTX 3090 FTW3 ULTRA 24GB GDDR6X Graphics Card  With Box Nvidia
- $97.8 Gigabyte AORUS Master RTX 5090 PCB Only No VRAM And Chip AU stock
- $432.1 Nvidia GeForce RTX 3080 Founders Edition 10GB w/ Box and Power Adapter
- $1,599 ASUS TUF Gaming GeForce RTX 3090 OC 24GB GDDR6X Graphics Card
- $875 ZOTAC GAMING GeForce RTX 4080 Trinity OC 16GB GDDR6X Graphics Card
- $339 MSI GeForce RTX 3080 Ventus 3X Plus OC LHR 10GB GDDR6X Graphics Card
- $550 EVGA NVIDIA GeForce RTX 3080 Ti FTW3 12GB
- $519.99 GIGABYTE GeForce RTX 4070 2X OC 12GB Graphics Card GDDR6X (GV-N4070WF2OC-12GD)
- $699 Gigabyte GeForce RTX 4070 SUPER WINDFORCE OC 12G GV-N407SWF3OC-12GD
- $979 OEM NVIDIA Gefoce RTX 3080 20GB Turbo GPU GDDR6X PCIe 4.0 x16 Graphics Card
- $719.99 PNY XLR8 Gaming Verto EPIC-X RPG Triple Fan GeForce RTX 4070 12GB  - Excellent
- $7,498.47 ASUS TUF Gaming GeForce RTX 5090 OC 32GB GDDR7 GPU NEW SEALED FREE NEXT DAY AIR!
- $6,995 ASUS TUF Gaming NVIDIA GeForce RTX 5090 OC 32GB GDDR7 RGB GPU
- $679.99 MSI Gaming GeForce RTX 4070 12GB Ventus 3X OC GDRR6X Graphics Card
- $398.88 EVGA GeForce RTX 3080 FTW3 ULTRA HYDRO COPPER 10GB GDDR6X Graphic Card
- $400 EVGA GeForce RTX 3080 FTW3 Ultra 10GB GDDR6X Graphics Card
- $399 ASUS TUF Gaming NVIDIA GeForce RTX 3080 CLEAN AND WORKING
- $843.62 MSI GeForce RTX 4070 Ti GAMING X SLIM 12GB GDDR6X Nvidia Graphics Card
- $1,500 MSI NVIDIA GeForce RTX 3090 OC Edition Ventus 3X Graphics Card
- $615 ASUS TUF NVIDIA GeForce RTX 4070 Ti 12GB GDDR6X Gaming Graphics Card
- $975 Asus TUF Gaming GeForce RTX 4070 TI Super 16 GB GDDR6X - Mint Condition
- $500 GIGABYTE NVIDIA Graphics Card High Performance Fan Heatsink PCI Express GPU
- $329.99 Dell OEM GeForce RTX 3080 10GB GDDR6X GPU / 04Y12V
- $788.99 ASUS TUF Gaming GeForce RTX 4070 Ti 12GB GDDR6X Graphics Card TUF-RTX4070TI-12G
- $788.99 MSI GeForce RTX 4070 Ti Ventus 3X OC 12GB GDDR6X Graphics Card G407TV3X12C
- $1,279.99 ASUS ROG Strix RTX 4080 OC 16GB Graphics Card ROG-STRIX-RTX4080-O16G-GAMING
- $1,750 ASUS TUF Gaming RTX 3090 OC 24GB GDDR6X Tested TUF-RTX3090-O24G-GAMING w/ Box
- $1,475 ZOTAC NVIDIA GeForce RTX 3090 Trinity 24GB GDDR6X Graphics Card ZT-A30900D-10P
- $2,698.98 OEM NVIDIA GeForce RTX 4080 32GB Founders Edition PCI Express 4.0 GDDR6X
- $384.99 Dell GeForce RTX 3080 10GB GDDR6X Graphics Card CN-OY5K9F-MSCOO-25H-0942-A02
- $1,729 ASUS TUF Gaming NVIDIA RTX 3090 Ti OC 24GB GDDR6X TUF-RTX3090TI-O24G-GAMING
- $1,650 MSI GeForce RTX 5080 Gaming X Trio 16GB GPU Graphics Card - Complete In Box
- $1,100 ZOTAC NVIDIA GeForce RTX 3090 Trinity 24GB GDDR6X Graphics Card ZT-A30900D-10P
- $1,400 ASUS ROG Strix GeForce RTX 3090 OC 24GB GDDR6X RGB Graphics Card
- $625 NVIDIA GeForce RTX 4070 Founders Edition 12GB Graphics Card
- $650 Zotac NVIDIA GeForce RTX 4070 RGB Dual Fan 12GB VRAM GDDR6X PCIe 4.0
- $1,709.99 NVIDIA GeForce RTX 3090 Ti Founders Edition FE 24GB GDDR6X 900-1G136-2505-000
- $635.25 EVGA GeForce RTX 3080 Ti FTW3 ULTRA GAMING 12GB GDDR6X Graphics Card
- $1,407.2 EVGA FTW3 Nvidia RTX 3090Ti 24GB GPU
- $320 GIGABYTE - AORUS Nvidia GeForce RTX 3080 Master
- $450 ASUS RTX 3080 ROG STRIX
- $1,600 ZOTAC GAMING GeForce RTX 3090 AMP Core Holo 24GB GDDR6X Graphics Card
- $449.99 ASUS ROG Strix GeForce RTX 3080 OC 10GB GDDR6X Graphics Card
- $599.99 Gigabyte GeForce RTX 4070 Windforce OC 12GB GDDR6X Graphics Card
- $1,499.99 New & Sealed NVIDIA GeForce RTX 5080 Founders Edition FE Graphics Card GPU
- $459.99 ASUS TUF Gaming GeForce RTX 3080 10GB RAM - Graphics Card - Very Good Condition
- $289 MSI NVIDIA GeForce RTX 3070 Ti Aero 8GB GDDR6X Graphics Card
- $180 EVGA GeForce RTX 3070 Ti XC3 ULTRA GAMING 8GB GDDR6X Graphics Card
- $500 EVGA NVIDIA GeForce RTX 3080 Ti FTW3 12GB
- $260 NVIDIA GeForce RTX 3070 Ti Founders Edition 8GB GDDR6X G-SYNC CUDA
- $380.8 Dell RTX 3080 10GB GDDR6X PCIE 4.0 NVIDIA GPU Gaming Graphics Card
- $400 NVIDIA GeForce RTX 3080 Founders Edition 10GB GDDR6X Graphics Card -...
- $15,000 5 Pack NVIDIA GeForce RTX 3090 Founders Edition 24GB GDDR6 Graphics Card -...
- $580 MSI NVIDIA GeForce RTX 4070 12 GB graphics card
- $890 ZOTAC GAMING GEFORCE RTX 4080 16GB TRINITY BLACK ED 256BIT GDDR6X GRAPHIC - HT18
- $1,285.44 EVGA Nvidia GeForce RTX 3090 FTW3 ULTRA GAMING 24GB GDDR6X Graphics Card
- $399.99 GeForce RTX 3080 Gaming OC 10GB GDDR6X
- $1 Gigabyte GeForce RTX 4070 SUPER WINDFORCE OC 12G GV-N407SWF3OC-12GD
- $309.99 MSI NVIDIA GeForce RTX 3070 Ti Gaming X Trio 8G 8GB GDDR6X Graphics Card w/ Box
- $929 Gigabyte RTX 4070 Ti Super Windforce 16GB GDDR6X - Tested Working w/ Box
- $1,350 NVIDIA GeForce RTX 3090 Founders Edition 24GB GDDR6 Graphics Card
- $595.69 10GB Asus TUF Gaming GeForce Rtx 3080 OC Edition PCI-E TUF-RTX3080-O10G-GAMING
- $879.99 NVIDIA Founders GeForce RTX 4070 Super 12GB GDDR6X Graphics Card Titanium/Black
- $350 EVGA GeForce RTX 3070 Ti FTW3 Ultra 8GB GDDR6X RGB Lighting Graphics Card
- $650 ASUS ROG Strix LC GeForce RTX 3080 Ti OC Edition 12GB GDDR6X Gaming Graphics...
- $335 NVIDIA GeForce RTX 3070 Ti Founders Edition 8GB GDDR6X Graphics Card
- $599 OEM NVIDIA RTX 3080 10GB GDDR6X Single Turbo Blowers Server GPU Video Card
- $919.99 Zotac GAMING GeForce RTX 4070 Ti Super SOLID OC Graphics Card  GPU
- $60 PNY RTX 4080 Super 16GB XLR8 Gaming Verto Epic-X RGB OC GPU NO CORE
- $799.99 ZOTAC GAMING GeForce RTX 4070 Ti Trinity OC 12GB GDDR6X Graphics Card
- $1,700 MSI Geforce RTX 3090 Ti Gaming X Trio W/ EK Water Block
- $1,319.99 NVIDIA Founders Edition GeForce RTX 3090 24GB - Graphics Card - Good Condition
- $949.99 Gigabyte GeForce RTX 4080 Super WindForce V2 16GB GDDR6X GV-N408SWF3V2-16GD
- $1,519.99 EVGA NVIDIA GeForce RTX 3090 FTW3 Ultra 24GB GDDR6X Graphics Card 24G-P5-3987-KR
- $1,599 Dell NVIDIA GeForce RTX 3090 24GB GDDR6X Dual Fan OEM 0N78PC
- $390 EVGA NVIDIA GeForce RTX 3080 FTW3 Ultra 10GB GDDR6X Triple Fan HDMI/DP PCIe x16
- $599 NVIDIA GeForce RTX 3080 Ti Founders Edition 12GB GDDR6X Graphics Card with Box
- $219.99 Nvidia RTX 3060 ti (rtx3060ti-08GD6X): Asus / 8GB GDDR6X / PCI Express 4.0 x16
- $319 PNY GeForce RTX 3060 Ti VERTO 8GB GDDR6X Dual Fan GPU Card Boxed Tested Used
- $450 ASUS TUF Gaming OC GeForce RTX 3080 10GB GPU
- $1,675 EVGA GeForce RTX 3090 FTW3 ULTRA GAMING 24GB GDDR6X Graphics Card..FREE SHIPPING
- $1,490 GIGABYTE GeForce RTX 4080 SUPER 16GB WINDFORCE V2 D6X Gaming Graphics Card
- $579.37 ZOTAC GAMING GeForce RTX 3080 Ti AMP Holo 12GB Nvidia GPU / 384 bit / GDDR6X
- $699.99 NVIDIA GeForce RTX 4070 SUPER Founders Edition 12GB - GPU / No Factory Box
- $569 ASUS ROG Strix RTX 3080 10GB White OC Tested Card Only
- $600 GIGABYTE GeForce RTX 4070 GAMING OC V2 12G GDDR6X Graphics Card - Original Box
- $419.99 EVGA GeForce RTX 3080 FTW3 ULTRA GAMING 10GB GDDR6X Graphics Card
- $1,549.99 NVIDIA GeForce RTX 3090 Founders Edition GPU 24GB GDDR6X Graphics Card
- $950 ASUS TUF Gaming GeForce RTX 4080 SUPER 16GB GDDR6X OC Graphic Card -USED
- $899.99 ASUS PRIME NVIDIA RTX 4070Ti SUPER 16GB GDDR6X DESKTOP GAMING GRAPHICS CARD
- $339.98 ASUS TUF Gaming NVIDIA RTX 3070 Ti OC Edition 8GB GDDR6X w/ 30 days warranty
- $699 HP GeForce RTX 4070 SUPER 12GB GDDR6X Graphics Card - Excellent
- $499.99 PNY GeForce RTX 4070 XLR8 Gaming 12GB GDDR6X DLSS 3 HDMI Graphics Card
- $1,200 GIGABYTE GeForce RTX 4080 SUPER WINDFORCE V2 16GB Graphic Card
- $190 GIGABYTE GeForce RTX 3080 Vision OC 12G 12GB GDDR6X CUDA PCIe x16
- $1,100 GIGABYTE GeForce RTX 4080 SUPER 16GB GDDR6X Ray Tracing DLSS 3 Graphics Card
- $759.99 ASUS DUAL RTX 4070 Super 12G OC EVO GDDR6X Graphics DUAL-RTX4070S-O12G-EVO-White
- $1,082.4 OEM NVIDIA Gefoce RTX 3080 20GB Turbo GPU GDDR6X PCIe 4.0 x16 Graphics Card
- $1,549 ASUS ROG Strix NVIDIA GeForce RTX 3090 OC 24GB VRAM GDDR6X Graphics Card GPU
- $300 EVGA NVIDIA GeForce RTX 3070 Ti FTW3 Ultra 8GB GDDR6X RGB Card
- $349 ASUS TUF NVIDIA GeForce RTX 3070 Ti 8GB GPU - Used, Working
- $1,100 PNY GeForce RTX 4080 SUPER OC Stealth Mode 16GB GDDR6X PCIe HDMI/DP
- $1,550 ASUS ROG Strix GeForce RTX 3090 OC 24GB GDDR6X Graphics Card
- $1,549.99 ASUS ROG Strix NVIDIA GeForce RTX 3090 OC 24GB VRAM GDDR6X Graphics Card
- $442 NVIDIA GeForce RTX 3080 10GB GDDR6X Founders Edition
- $590 GIGABYTE GeForce RTX 4070 SUPER 12GB GDDR6X Triple Fan HDMI/DP
- $459.97 Zotac GeForce RTX 3080 10GB AMP Holo A30800F / 1yr Warranty, Fast Ship!
- $1,879.97 EVGA GeForce RTX 3090 24GB XC3 Ultra 24G-P5-3975-KB / 1yr Warranty, Fast Ship!
- $495 ASUS TUF Gaming GeForce RTX 3080 OC 10GB Graphics Card (Factory Sealed)
- $180 EVGA NVIDA GeForce RTX 3080 10GB COMPLETELY UNTESTED (I Don’t Know If It Works)
- $1,200 ASUS ProArt GeForce RTX 4080 Super OC Edition Graphics Card
- $549.99 MSI NVIDIA GeForce RTX 5060 Ti Gaming Trio OC Triple Fan 8GB GDDR7 PCIe 5.0 NEW
- $8,399.95 ASUS ROG Astral GeForce RTX 5090 OC Edition Gaming Graphics Card 32GB GDDR7
- $849.99 ASUS ROG Strix Gaming OC  Edition GeForce RTX 4070 Ti 12GB - GPU - Excellent
- $725 ASUS Prime GeForce RTX 5070 OC 12GB
- $6,500 NVIDIA GeForce RTX 5090 Founders Edition 32GB GDDR7 Barely Used w/ Original Box
- $359.99 EVGA GeForce RTX 3070 Ti 8GB GDDR6X FTW3 Ultra Graphics Card 08G-P5-3797-KL
- $1,399 ASUS TUF Gaming NVIDIA GeForce RTX 3090 OC
- $1,575 EVGA RTX 3090 FTW3 Ultra Gaming 24GB
- $430 EVGA Nvidia GeForce RTX 3080 FTW3 10GB Hydro Copper + Fan Cooled Heatsink
- $444 Asus GeForce RTX 3080 TUF Gaming 10GB GDDR6X Graphics Card
- $920 ASUS TUF Gaming GeForce RTX 4080 16GB GDDR6X Graphics Card
- $385 ASUS TUF Gaming NVIDIA GeForce RTX 3080 OC 10GB GDDR6X RGB HDMI/DP PCIe
- $1,400 ZOTAC GAMING GeForce RTX 3090 Trinity 24GB GDDR6X DX12 HDMI/DP (used)
- $295 ASUS ROG Strix GeForce RTX 3070 Ti OC 8GB GDDR6X RGB
- $879 Gefoce RTX 3080 20GB OEM Turbo GPU NVIDIA GDDR6X PCIe 4.0 x16 Graphics Card
- $1,900 RTX 5080 Founders Edition
- $499 ASUS ProArt NVIDIA GeForce RTX 4060 Ti 16GB GDDR6X Graphics Card GPU AI ComfyUI
- $668.42 EVGA Nvidia GeForce RTX 3080Ti FTW3 GPU Ultra 12GB Graphics Card like 5070
- $675 NVIDIA GeForce RTX 3080 Ti Founders Edition 12GB GDDR6X Graphics Card
- $1,507 NVIDIA GeForce RTX 3090 Founders Edition 24GB GDDR6X With Box and Accessories
- $319.95 MSI GeForce RTX 3070 Ti Gaming X Trio 8GB GDDR6X GPU Graphics Card w/ Box
- $515 MSI GeForce RTX 3080 Ti Gaming X Trio 12GB GDDR6X Triple Fan PCIe
- $2,059.99 ASUS TUF Gaming NVIDIA RTX 3090 Ti OC 24GB GDDR6X TUF-RTX3090TI-O24G-GAMING
- $449.99 Dell GeForce RTX 4070 Super dell oem 12GB GDDR6X Graphics Card E32-0408760-C24
- $5,972.85 ASUS ROG STRIX NVIDIA GeForce RTX 409 0 24GB OC EVA-02 Edition

</details>

## NVIDIA RTX A5000 24GB (`rtx-a5000`), gate: 8 usable

| Variant | Query | Pages | Raw | Fewer words | Excl. term | Excl. kw | Title mismatch | Wrong variant | System | Out of range | **Usable** | Median | Range |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| baseline | `RTX A5000 24GB -(box,cooler,broken,parts,laptop,mobile)` | 1 | 128 | 0 | 4 | 0 | 5 | 0 | 0 | 116 | **3** | $1,505 | $1,200–$1,600 |
| minimal | `RTX A5000` | 2 | 188 | 0 | 29 | 16 | 8 | 0 | 0 | 132 | **3** | $1,505 | $1,200–$1,600 |
| nvidia | `NVIDIA RTX A5000` | 1 | 187 | 0 | 29 | 16 | 8 | 0 | 0 | 131 | **3** | $1,505 | $1,200–$1,600 |
| pny | `PNY RTX A5000` | 1 | 251 | 204 | 20 | 66 | 88 | 0 | 0 | 74 | **3** | $1,505 | $1,200–$1,600 |
| quadro | `Quadro RTX A5000` | 1 | 255 | 225 | 16 | 95 | 42 | 0 | 0 | 100 | **2** | — | — |
| gddr6 | `A5000 24GB GDDR6` | 1 | 123 | 0 | 6 | 0 | 5 | 0 | 0 | 109 | **3** | $1,505 | $1,200–$1,600 |
| dell-hp-lenovo | `RTX A5000 (Dell,HP,Lenovo)` | 1 | 37 | 0 | 3 | 11 | 5 | 0 | 0 | 17 | **1** | — | — |
| combined | `all non-baseline variants, each eBay item counted once` | — | 456 | 267 | 44 | 153 | 124 | 0 | 0 | 132 | **3** | $1,505 | $1,200–$1,600 |

Combined: 3 usable (gate 8: NOT reached).

<details><summary>Combined: usable titles, and titles removed as wrong variant / complete system / title mismatch</summary>

Usable:
- $1,505 Dell NVIDIA RTX A5000 GPU / 24gb VRAM
- $1,199.99 PNY NVIDIA RTX A5000 4x DisplayPort 24GB GDDR6 Graphics Card VCNRTXA5000
- $1,600 PNY NVIDIA RTX A5000 24GB GDDR6 Graphics Card

Removed as title-mismatch:
- $13.5 Bracket for NVIDIA Quadro RTX 5000 RTX 6000 RTX 8000 Professional Graphics Card
- $14.9 Bracket for NVIDIA Quadro RTX 5000 RTX 6000 RTX 8000 Professional Graphics Card
- $1,825 Apple MacBook Pro 16” M4 Pro 48GB 1TB SSD 20-Core GPU Silver Z1FP000C6LL/A 2024
- $35 Disney mystery bundle box!
- $10 Disney Light Side Vs Dark Side Mystery Pin Palpatine Star Wars
- $19.95 Disney Parks 2026 Star Wars Light Side Vs Dark Side Mystery Box Pin (You Choose)
- $17.98 YOU PICK Disney Parks Star Wars LIGHT SIDE VS DARK SIDE Mystery Pin COMBINE SHIP
- $31.99 Thermaltake Smart 500W 80 PLUS ATX Power Supply PSU Black SPD-0500AH2NCW
- $2,300 PNY NVIDIA RTX A5500 24GB GDDR6 Graphics Card
- $999 PNY NVIDIA RTX A4500 20GB GDDR6 Graphics Card - MINT CONDITION
- $799 PNY NVIDIA RTX A4500 20GB GDDR6 Workstation GPU – Tested Working (1 DP Port Only
- $1,249.97 PNY Quadro RTX A4500 20GB GDDR6 VCNRTXA4500-PB GPU / 1yr Warranty, Fast Ship!
- $1,239.95 Open Box - PNY NVIDIA RTX A4500 20GB GDDR6 PCIe 4.0 x16 Graphics VCNRTXA4500-PB
- $325 PNY NVIDIA RTX A2000 Professional Graphics Card
- $172.5 PNY Graphics Card NVIDIA RTX A400 4GB GDDR6 VCNRTXA400ATX-B - Black
- $3,975 PNY NVIDIA RTX A6000 48GB GDDR6 Graphics Card
- $300 PNY NVIDIA RTX A2000 PCIe x16 Graphics Card, Multi-Monitor, mDP DVI
- $329.99 PNY NVIDIA RTX A2000 Graphics Card VCNRTXA2000ATX
- $525 PNY NVIDIA RTX A2000 12GB GDDR6 Graphics Card (‎VCNRTXA200012GB-PB)
- $320 NVIDIA RTX A2000 6GB (GDDR6) Workstation GPU
- $450 PNY NVIDIA Quadro RTX A2000 12GB GDDR6 Graphics Card VCNRTXA200012GB
- $5,699 PNY NVIDIA RTX PRO 5000 Blackwell 48GB GDDR7 OEM PCIe 5.0 Workstation
- $499 NVIDIA RTX A2000 12GB GDDR6 PNY Graphics Card GPU  VCNRTXA200012GB
- $950 PNY NVIDIA RTX A4500 20GB GDDR6 Graphics Card
- $330 PNY NVIDIA RTX A2000 6GB GDDR6 Graphics Card 4x Mini DisplayPort PCIe 4.0
- $299.98 PNY NVIDIA RTX A2000 GRAPHICS CARD 6GB GDDR6 w/ 30 days warranty
- $250 PNY NVIDIA RTX A4500 20GB GDDR6 PCIe 4.0 x16 Graphics card - VCNRTXA4500-PB
- $1,294.97 PNY RTX A4500 20GB VCNRTXA4500PB GPU / Brand New, Fast Ship!
- $910.49 NVIDIA RTX A4500 Workstation Graphics Card 20GB GDDR6
- $150 PNY NVIDIA RTX A400 ATX GPU Graphics Card - NVIDIA Chipset Manufacturer
- $3,975 PNY NVIDIA RTX A6000 48GB GDDR6 Graphics Card
- $499 NVIDIA RTX A2000 12GB GDDR6 PNY Graphics Card GPU  VCNRTXA200012GB
- $425 NVIDIA RTX A2000 12GB GDDR6 PNY Graphics Card GPU
- $350 PNY NVIDIA RTX A2000 6GB GDDR6 GPU — Hi/Lo Brackets, 3x mDP Adapters, Box
- $1,249.95 PNY NVIDIA RTX A4500 20GB Graphics Card New Sealed
- $900 PNY NVIDIA RTX A4500 20GB GDDR6 Graphics Card
- $430 NVIDIA RTX A2000 12GB GDDR6 PNY Graphics Card GPU
- $9,899 2x NVIDIA RTX A6000 48GB GDDR6 384-bit GPU Graphics Card
- $329.99 PNY NVIDIA RTX A2000 6GB GDDR6 - PRISTINE - Original Box, 4x miniDP Adapters
- $889.99 PNY NVIDIA RTX A4500 20GB GDDR6 ECC Workstation GPU PCIe 4.0 4x DP
- $399 PNY NVIDIA RTX A1000 8GB GDDR6 Workstation GPU VCNRTXA1000ATX-PB NEW in Box
- $900 PNY NVIDIA RTX A4500 20GB GDDR6 PCIe 4.0 x16 Graphics VCNRTXA4500-PB
- $300 PNY NVIDIA RTX A2000 Workstation Graphics Card 6GB GDDR6 ECC
- $325 NVIDIA RTX A2000 6GB (GDDR6) Workstation GPU Low Profile 70W - great condition!
- $325 PNY NVIDIA RTX A2000 6GB GDDR6 Graphics Card (VCNRTXA2000-BLK)
- $1,199.95 PNY NVIDIA RTX A4500 20GB GDDR6 PCIe 4.0 x16 Graphics VCNRTXA4500-PB Exc 1 Year
- $320 PNY NVIDIA RTX A2000 6GB GDDR6 Graphics Card
- $329.99 NVIDIA RTX A2000 6GB GDDR6 - PRISTINE CONDITION - Retail Box, 4x miniDP Adapters
- $130 Used4GB PNY nVIDIA Quadro Rtx A400 PCI-E 4.0 x8 VCNRTXA400-PB Graphics
- $850 PNY NVIDIA RTX A4000 PCIe x16 Graphics Card DisplayPort Multi-Monitor
- $310 NVIDIA RTX A2000 6GB GDDR6 Graphics Card
- $3,749.99 New PNY RTX A6000 48GB GDDR6 Graphics Card READ
- $3,500 PNY VCNRTX5000ADA-PB NVIDIA RTX 5000 ADA Gen 32GB PCIe 4.0 x16 DP Graphics Card
- $459 PNY NVIDIA RTX A2000 12GB GDDR6 ECC Workstation GPU 4x Mini DisplayPort
- $449 NVIDIA RTX A2000 12GB GDDR6 PNY Graphics Card GPU  VCNRTXA200012GB
- $310 PNY NVIDIA RTX A2000 6GB GDDR6 PCIe 4.0 Graphics Card Tested Working *31
- $549.99 New PNY RTX A2000 12GB GDDR6 Graphics Card VCNRTXA200012GB-PB
- $329 NVIDIA RTX A2000 6GB (GDDR6) PNY Workstation GPU Low Profile 70W, Stress Tested
- $325 PNY NVIDIA RTX A2000 6GB GDDR6 Graphics Card 4x Mini DisplayPort
- $420 PNY NVIDIA RTX A2000 12GB GDDR6 PCIe 4.0 GPU Graphics Card SKU: VCNRTXA200012GB
- $3,499 PNY NVIDIA RTX 5000 Ada 32GB GDDR6 NEW Sealed GPU
- $949.99 PNY NVIDIA RTX A4500 Graphics Card - 20GB GDDR6 - Workstation GPU w/ Accessories
- $289.99 PNY NVIDIA RTX A2000 6GB GDDR6 Graphics Card
- $469.99 NVIDIA RTX A2000 12GB GDDR6 PNY Graphics Card GPU  VCNRTXA200012GB
- $549 NVIDIA RTX A2000 12GB GDDR6 PNY Graphics Card GPU  (New)
- $3,750 NVIDIA RTX A6000 48GB GDDR6
- $295 PNY NVIDIA RTX A2000 6GB GDDR6 Graphics Card with Box and All Accessories
- $3,359.99 NVIDIA Quadro RTX 5000 ADA 32GB GDDR6 Graphic Card
- $309.99 PNY NVIDIA RTX A2000 6GB GDDR6 Graphics Card VCNRTXA2000 - Tested
- $395 PNY Nvidia RTX A1000 8GB PCI-E Video Card VCNRTXA1000ATX-PB
- $3,998 NVIDIA RTX A6000 48GB GDDR6 384-bit GPU Graphics Card
- $349.97 PNY RTX A2000 6GB GDDR6 Full/Low Profile + miniDP Adapters / 1yr Warranty, Fa...
- $1,000 PNY NVIDIA RTX A4500 Workstation Graphics Card 20GB GDDR6 ECC VCNRTXA4500
- $449.99 NVIDIA Quadro RTX A2000 12GB GDDR6 Graphics Card VCNRTXA200012GB
- $3,975 PNY NVIDIA RTX A6000 48GB GDDR6 Graphics Card
- $499 NVIDIA RTX A2000 12GB GDDR6 PNY Graphics Card GPU  VCNRTXA200012GB
- $420 PNY NVIDIA RTX A2000 12GB GDDR6 PCIe 4.0 GPU Graphics Card SKU: VCNRTXA200012GB
- $315 PNY NVIDIA RTX A2000 6GB GDDR6 Graphics Card 4x Mini DisplayPort USA
- $344.97 PNY RTX A2000 6GB GDDR6 Full Height / 1yr Warranty, Fast Ship!
- $319.99 NVIDIA RTX A2000 6GB GDDR6 Graphics Card - Tested
- $450 PNY NVIDIA RTX A2000 12GB GDDR6 Graphics Card (‎VCNRTXA200012GB-PB)
- $460 NVIDIA RTX A2000 12GB GDDR6 PNY Graphics Card GPU  PG192/12GB
- $500 PNY NVIDIA RTX A4500 20GB GDDR6 PCIe 4.0 x16 Graphics card - VCNRTXA4500-PB
- $299.98 PNY NVIDIA RTX A2000 GRAPHICS CARD 6GB GDDR6 w/ 30 days warranty
- $484.49 PNY NVIDIA Quadro RTX A2000 12GB GDDR6 Graphics Card VCNRTXA200012GB
- $399 PNY NVIDIA RTX A1000 8 GB GDDR6 Graphics Card M3R8K
- $310 PNY NVIDIA RTX A2000 6gb low profile graphics card GPU L7
- $999 PNY NVIDIA RTX A4500 20GB GDDR6 w/ ECC PCIe 4.0 x16 VCNRTXA4500 Graphics Card
- $874 PNY NVIDIA GRAPHICS CARD RTX A4500, Open Box
- $3,499.99 New PNY RTX A6000 48GB GDDR6 Graphics Card READ
- $1,600 PNY NVIDIA RTX A4000 ADA SFF 20G w/ Aftermarket Heatsink
- $499 NVIDIA RTX A2000 12GB GDDR6 PNY Graphics Card GPU  VCNRTXA200012GB
- $659.28 NVIDIA Quadro RTX A4500 20GB GDDR6 Workstation AI GPU (VCNRTXA4500)
- $1,229.99 DELL Quadro RTX A4500 20GB RAM - Graphics Card - Very Good Condition
- $293 PNY NVIDIA Quadro RTX A2000 12GB GDDR6 SFF PCIe x16 Mini DisplayPort CUDA
- $1,500 HP NVIDIA Quadro RTX A4500 20GB GDDR6 PCIe 4.0 x16 N02456-001/N02798-001
- $460 NVIDIA Quadro RTX A2000 12GB GDDR6 PCIe 4.0 Cuda Graphics Card
- $3,500 NVIDIA Quadro RTX A6000 48GB RAM - Graphics Card
- $485 HP NVIDIA Quadro RTX A2000 12GB GDDR6 Graphics Card N02455-001 N02797-001
- $1,229.99 HP Quadro RTX A4500 20GB RAM - Graphics Card - Excellent Condition
- $150 PNY Technology VCNRTXA400ATX-PB NVIDIA Quadro RTX A400 4GB GDDR6 64-Bit Card
- $900 NVIDIA Quadro RTX A4500 20GB GDDR6 Graphics Card
- $489.99 Dell 0YDNGM NVIDIA Quadro RTX A2000 12GB GDDR6 Graphics Card 900-5G192-0150-000
- $900 NVidia Quadro RTX A4000 GPU
- $350 NVIDIA Quadro RTX 5000 Graphics Card
- $415 NVIDIA Quadro RTX A2000 12GB GDDR6 Professional Graphics Card
- $1,999.99 NVIDIA Quadro RTX 8000 48GB GDDR6 Active Blower GPU HPE P11095-001 Tested
- $485 HP NVIDIA Quadro RTX A2000 12GB GDDR6 Graphics Card N02455-001 N02797-001
- $900 NVIDIA Quadro RTX A4500 20GB GDDR6 Graphics Card - ships free
- $350 NVIDIA Quadro RTX A2000 6GB GDDR6 / full and low profile bracket, miniDP cable
- $435 HP NVIDIA Quadro RTX A2000 12GB GDDR6 Graphics Card N02455-001 N02797-001
- $479.99 HP NVIDIA Quadro RTX A2000 12GB GDDR6 Low Profile GPU Card N02455-001 N02797-001
- $999.99 NVIDIA Quadro RTX A4500 20GB GDDR6 Graphics Card
- $435 HP NVIDIA Quadro RTX A2000 12GB GDDR6 Graphics Card N02455-001 N02797-001
- $799.99 NVidia Quadro RTX A4000 GPU
- $365 NVIDIA Quadro RTX A2000 6GB GDDR6 / original box, full and low profile bracket
- $975 699-5G190-0511-711 NVIDIA QUADRO RTX A4000H GPU GRAPHICS CARD
- $4,339.99 Lenovo Quadro RTX A6000 48GB RAM - Graphics Card - Excellent Condition
- $1,219.99 NVIDIA Quadro RTX A4500 20GB GDDR6 Workstation AI GPU (VCNRTXA4500)
- $499.95 Dell YDNGM NVIDIA Quadro RTX A2000 12GB GDDR6 Graphics Card High Profile
- $900 NVIDIA Quadro RTX A4500 20GB GDDR6 Graphics Card NO BOX
- $445 HP NVIDIA Quadro RTX A2000 12GB GDDR6 Graphics Card N02455-001 N02797-001
- $304.99 NVIDIA Quadro RTX A2000 6GB GDDR6 GPU GRAPHICS CARD
- $1,159.09 Lenovo Quadro RTX A4500 20GB RAM - Graphics Card - Excellent Condition

</details>
