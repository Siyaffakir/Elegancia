# Algeria Delivery Companies — Public Pricing Research

**Research date:** 17 August 2026  
**Scope:** Publicly available delivery pricing for Algerian courier / e-commerce delivery companies.

> Important: Algeria has far more delivery operators than the usual Yalidine / ZR / Noest names.  
> The ARPCE registry lists **155+ domestic express operators**. However, most operators do **not** publish a clean public tariff table.

---

## 1. Main Companies With Publicly Recoverable Pricing

| Company | Data Quality | Home Delivery | Stop Desk | Notes |
|---|---|---:|---:|---|
| **ZR Express** | Very good | ~600–1,600 DA | ~450–1,120 DA | Official calculator, updated Apr 2026 |
| **Noest Express** | Very good | ~500–2,200 DA | ~300–1,500 DA | Public 58-wilaya tariff data available |
| **Maystro Delivery** | Good | ~400–1,700 DA | ~300–1,200 DA | Business + Premium/Gold tariffs |
| **EcoTrack / TawsilStar** | Good, but older | ~500–1,600 DA | ~300–1,000 DA | Exact tariff sheet found |
| **Yalidine** | Multiple public datasets | ~450–1,700 DA | ~250–1,100 DA | Dynamic/public rates; contracts may differ |
| **DHD** | Partial | ~500–1,500+ DA | Varies | Uses EcoTrack infrastructure in some integrations |
| **Anderson** | Partial | Varies | Varies | Public e-commerce tariff data is less clean |
| **EcoTrack-integrated couriers** | API-derived | Varies | Varies | Includes many Algerian couriers |

---

# 2. ZR Express

ZR Express exposes an official tariff calculator.

The official tariff page states:

- pricing depends on origin
- destination
- weight
- delivery mode
- tariff calculator updated **April 2026**
- national coverage across 58 wilayas

Official source:

https://www.zrexpress.net/ar/tarifs

A merchant using ZR Express also publishes delivery prices:

https://nxtdz.com/fr/delivery

## Example ZR Express Rates

| Wilaya | Home | Stop Desk |
|---|---:|---:|
| Alger | 600 DA | 520 DA |
| Blida | 750 DA | 520 DA |
| Constantine | 750 DA | 520 DA |
| Oran | 800 DA | 520 DA |
| Sétif | 750 DA | 520 DA |
| Annaba | 750 DA | 520 DA |
| Béjaïa | 750 DA | 520 DA |
| Chlef | 800 DA | 520 DA |
| Biskra | 800 DA | 570 DA |
| Ouargla | 950 DA | 670 DA |
| Ghardaïa | 950 DA | 670 DA |
| Béchar | 1,100 DA | 720 DA |
| Adrar | 1,400 DA | 970 DA |
| Timimoun | 1,400 DA | 970 DA |
| Tamanrasset | 1,600 DA | 1,120 DA |
| In Salah | 1,600 DA | 1,120 DA |

### Notes

ZR pricing should **not** be modeled as a single static value per wilaya.

The proper quote parameters are closer to:

```text
origin_wilaya
destination_wilaya
weight
delivery_type
```

---

# 3. Noest Express

Public merchant tariff tables were found covering most or all Algerian wilayas.

Example source:

https://imtechdz.com/refund_returns/

## Example Noest Rates

| Wilaya | Home | Stop Desk |
|---|---:|---:|
| Alger | 700 DA | 450 DA |
| Blida | 800 DA | 500 DA |
| Constantine | 500 DA | 300 DA |
| Oran | 800 DA | 500 DA |
| Sétif | 800 DA | 500 DA |
| Annaba | 800 DA | 500 DA |
| Béjaïa | 800 DA | 500 DA |
| Chlef | 800 DA | 500 DA |
| Batna | 800 DA | 500 DA |
| Biskra | 1,000 DA | 600 DA |
| Ouargla | 1,100 DA | 700 DA |
| Ghardaïa | 1,100 DA | 700 DA |
| Béchar | 1,200 DA | 800 DA |
| Adrar | 1,500 DA | 1,000 DA |
| Timimoun | 1,500 DA | 1,000 DA |
| Tamanrasset | 2,000 DA | 1,500 DA |
| Tindouf | 1,700 DA | 1,000 DA |
| In Salah | 1,800 DA | 1,200 DA |
| Djanet | 2,200 DA | 1,500 DA |

---

# 4. Maystro Delivery

A public service offer document exposes Business and Premium / Gold delivery pricing.

Source:

https://fr.scribd.com/document/1033004067/Offre-de-Service-MAYSTRO-Delivery-FR

## Maystro Business — Example Home Delivery Rates

| Wilaya / Zone | Home Delivery |
|---|---:|
| Alger | 400 DA |
| Blida | 600 DA |
| Boumerdès | 600 DA |
| Tipaza | 600 DA |
| Constantine | 750 DA |
| Oran | 750 DA |
| Annaba | 800 DA |
| Biskra | 900 DA |
| Ouargla | 900 DA |
| El Oued | 900 DA |
| Béchar | 1,000 DA |
| Naâma | 1,000 DA |
| El Bayadh | 1,000 DA |
| Béni Abbès | 1,100 DA |
| Adrar | 1,200 DA |
| Timimoun | 1,200 DA |
| In Salah | 1,500 DA |
| Tindouf | 1,700 DA |

## Stop Desk

Typical published prices include:

| Zone | Stop Desk |
|---|---:|
| Alger | ~300 DA |
| Many northern wilayas | ~450 DA |
| Several southern wilayas | ~600 DA |
| Adrar | ~900 DA |
| Tindouf | ~1,200 DA |

### Notes

Maystro also offers Premium / Gold pricing, which may be approximately **50–100 DA cheaper** than normal Business pricing on some destinations.

Some documents quote prices **HT**, so VAT / tax handling must be checked before using the values commercially.

---

# 5. EcoTrack / TawsilStar

EcoTrack is especially important because many Algerian delivery companies appear to use its logistics platform / API ecosystem.

Public tariff sheet:

https://fr.scribd.com/document/1012954749/Frais-Livraison-Tawsilstar-Guelma-Ecotrack

## Example EcoTrack Rates

| Wilaya | Home | Stop Desk |
|---|---:|---:|
| Alger | 550 DA | 300 DA |
| Blida | 600 DA | 300 DA |
| Oran | 600 DA | 300 DA |
| Constantine | 650 DA | 400 DA |
| Sétif | 650 DA | 400 DA |
| Annaba | 650 DA | 400 DA |
| Chlef | 600 DA | 300 DA |
| Tlemcen | 500 DA | 300 DA |
| Béjaïa | 650 DA | 400 DA |
| Biskra | 650 DA | 400 DA |
| Ouargla | 1,000 DA | 600 DA |
| Béchar | 1,100 DA | 700 DA |
| Adrar | 850 DA | 550 DA |
| Tamanrasset | 1,500 DA | 1,000 DA |
| Timimoun | 1,400 DA | 800 DA |
| In Salah | 1,600 DA | 1,000 DA |

### Weight Surcharge

The discovered tariff sheet states:

```text
+50 DA for each additional 5 kg after the first 5 kg
```

This is another reason prices should not be stored purely as:

```text
company + wilaya = price
```

---

# 6. Yalidine

Yalidine is one of the largest e-commerce delivery providers in Algeria.

Public pricing datasets exist, although merchant contract pricing may differ.

A public 2026-oriented dataset was found here:

https://dropdz.space/livraison-algerie

## Example Yalidine Rates

| Wilaya | Home | Stop Desk |
|---|---:|---:|
| Alger | 500 DA | 400 DA |
| Oran | 450 DA | 250 DA |
| Blida | 600 DA | 400 DA |
| Constantine | 800 DA | 400 DA |
| Chlef | 690 DA | 400 DA |
| Sétif | 750 DA | 400 DA |
| Béjaïa | 790 DA | 400 DA |
| Ouargla | 900 DA | 500 DA |
| Béchar | 1,000 DA | 600 DA |
| Adrar | 1,100 DA | 600 DA |
| Tamanrasset | 1,100 DA | 600 DA |
| Illizi | 1,300 DA | 600 DA |
| Timimoun | 1,700 DA | 1,100 DA |
| El Menia | 1,700 DA | 1,100 DA |
| Djanet | 1,700 DA | 1,100 DA |

The dataset reports approximately:

```text
Average Home Delivery: ~869 DA
Average Stop Desk:     ~489 DA
Covered Communes:      ~1,551
```

### Warning

Do **not** treat these values as guaranteed contractual merchant prices.

Yalidine pricing can depend on:

- merchant agreement
- origin
- destination
- delivery mode
- parcel weight
- account volume
- special negotiated rates

---

# 7. EcoTrack-Integrated Algerian Couriers

Open-source Algerian shipping integrations expose a large number of courier providers.

Useful repositories:

## ShippingDz

https://github.com/abdouh071/ShippingDz

Reported integrations include companies such as:

- DHD
- Conexlog
- MSM Go
- Rex Livraison
- RB Livraison
- Speed Delivery
- Areex
- Prest
- Rocket Delivery
- World Express
- BA Consult
- Packers
- 48hr Livraison
- MonoHub
- Anderson Delivery
- Golivri
- Coyote Express
- Salva Delivery
- Distazero
- Fret Direct
- TSL Express
- Negmar Express

Many of these appear to rely on the EcoTrack ecosystem or compatible APIs.

---

# 8. CourierDZ

Another useful Algerian shipping integration project:

https://github.com/PiteurStudio/CourierDZ

It exposes rate-related functionality for providers such as:

- Yalidine
- Procolis / ZR Express
- EcoTrack-based couriers

Typical usage pattern is equivalent to:

```text
getRates(origin, destination)
```

This is valuable because it confirms that Algerian courier pricing is often obtained as a **rate quote**, rather than as one globally static tariff table.

---

# 9. ARPCE Registered Delivery Operators

Official ARPCE service registry:

https://www.arpce.dz/fr/service/post-sd

The registry contains **155+ domestic express operators**.

Examples include:

- Yalidine
- Guepex
- ZR-related operators
- Maystro
- DHD
- Noest / Nord et Ouest
- Anderson
- MSM Go
- Areex
- Coyote
- Packers
- Golivri
- many smaller regional operators

The problem is that a large part of these companies do **not** publish their tariffs online.

Therefore:

```text
registered courier != publicly scrapeable pricing
```

---

# 10. Cross-Company Comparison

Example comparison for selected wilayas.

| Wilaya | ZR Home | ZR Desk | Noest Home | Noest Desk | Maystro Home |
|---|---:|---:|---:|---:|---:|
| Alger | 600 | 520 | 700 | 450 | 400 |
| Blida | 750 | 520 | 800 | 500 | 600 |
| Constantine | 750 | 520 | 500 | 300 | 750 |
| Oran | 800 | 520 | 800 | 500 | 750 |
| Sétif | 750 | 520 | 800 | 500 | 750 |
| Annaba | 750 | 520 | 800 | 500 | 800 |
| Béjaïa | 750 | 520 | 800 | 500 | 750 |
| Chlef | 800 | 520 | 800 | 500 | 750 |
| Biskra | 800 | 570 | 1,000 | 600 | 900 |
| Ouargla | 950 | 670 | 1,100 | 700 | 900 |
| Ghardaïa | 950 | 670 | 1,100 | 700 | 900 |
| Béchar | 1,100 | 720 | 1,200 | 800 | 1,000 |
| Adrar | 1,400 | 970 | 1,500 | 1,000 | 1,200 |
| Timimoun | 1,400 | 970 | 1,500 | 1,000 | 1,200 |
| Tamanrasset | 1,600 | 1,120 | 2,000 | 1,500 | — |
| Tindouf | — | — | 1,700 | 1,000 | 1,700 |
| In Salah | 1,600 | 1,120 | 1,800 | 1,200 | 1,500 |
| Djanet | — | — | 2,200 | 1,500 | — |

Values are in Algerian dinars.

---

# 11. Recommended Database Structure

Do **not** design the database as:

```text
courier
wilaya
price
```

That will break as soon as the courier introduces different origins, stop-desk prices, weight rules or negotiated tariffs.

Recommended structure:

```text
courier
origin_wilaya
destination_wilaya
destination_commune

delivery_type
    HOME
    STOP_DESK

weight_from
weight_to

base_price
additional_weight_fee

return_fee
exchange_fee
pickup_fee
cod_fee

is_available

price_type
    PUBLIC
    CONTRACT
    API

effective_date
source_url
source_name
last_verified_at
reliability
```

Possible additional fields:

```text
vat_included
minimum_cod
maximum_cod
free_return
failed_delivery_fee
oversized_fee
remote_area_fee
insurance_fee
```

---

# 12. Reliability Levels

Recommended classification:

## HIGH

Official courier API or official courier tariff page.

Examples:

- ZR official calculator
- courier-authenticated API

## MEDIUM

Tariff published by a merchant using the courier.

Examples:

- merchant delivery pages
- agency tariff sheets

## LOW / TEMPORARY

Community datasets, GitHub repositories, cached prices or old PDFs.

These can still be useful for discovery, but should be verified before being treated as production pricing.

---

# 13. Practical Priority List

If the goal is to build an Algerian delivery price comparison platform, start with:

## Tier 1

1. Yalidine / Guepex
2. ZR Express
3. Noest Express
4. Maystro
5. DHD / EcoTrack

These cover a very large portion of Algerian e-commerce delivery activity.

## Tier 2

Add EcoTrack-compatible operators:

- MSM Go
- Anderson
- Coyote
- Areex
- Packers
- Golivri
- RB Livraison
- Rex Livraison
- World Express
- Rocket Delivery
- Speed Delivery
- etc.

## Tier 3

Go through the official ARPCE registry and contact / scrape individual regional operators.

---

# 14. Main Sources

### Official / Company

- ARPCE domestic express operator registry  
  https://www.arpce.dz/fr/service/post-sd

- ZR Express tariffs  
  https://www.zrexpress.net/ar/tarifs

- ZR merchant tariff example  
  https://nxtdz.com/fr/delivery

### Public merchant / tariff documents

- Noest tariff example  
  https://imtechdz.com/refund_returns/

- Maystro service offer  
  https://fr.scribd.com/document/1033004067/Offre-de-Service-MAYSTRO-Delivery-FR

- EcoTrack / TawsilStar tariff sheet  
  https://fr.scribd.com/document/1012954749/Frais-Livraison-Tawsilstar-Guelma-Ecotrack

- Yalidine public delivery dataset  
  https://dropdz.space/livraison-algerie

### GitHub / Open Source

- ShippingDz  
  https://github.com/abdouh071/ShippingDz

- CourierDZ  
  https://github.com/PiteurStudio/CourierDZ

---

# 15. Main Conclusion

The Algerian delivery market cannot accurately be represented using one simple price table.

Actual pricing can depend on:

```text
Courier
+ Origin
+ Destination
+ Commune
+ Home / Stop Desk
+ Weight
+ Parcel dimensions
+ Contract
+ Merchant volume
+ Additional services
```

There are **155+ registered domestic express operators**, but only a subset expose usable public tariffs.

The highest-value companies to normalize first are:

```text
Yalidine
ZR Express
Noest
Maystro
EcoTrack / DHD
```

Then use EcoTrack-compatible APIs and open-source Algerian courier integrations to expand coverage to dozens of smaller operators.

---

## Data Caveat

Delivery pricing changes regularly.

Before using any scraped rate for billing or checkout:

1. verify against the courier's live API when possible;
2. store the source and effective date;
3. distinguish public price from negotiated merchant price;
4. keep historical tariff versions instead of overwriting old prices.
