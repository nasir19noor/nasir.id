/**
 * FolaPlay match highlights (https://www.youtube.com/@folaplayapps).
 *
 * `MATCH_HIGHLIGHT_VIDEOS` maps a match to its specific "FULL MATCH HIGHLIGHT"
 * video. The key is the two team codes sorted alphabetically, which is
 * order-independent and unique across the tournament (a given pair only meets
 * once). Scraped from the channel's video list — the titles use Indonesian
 * country names (e.g. Inggris = England, Mesir = Egypt), so `TEAM_NAME_ID`
 * mirrors that for the search fallback used when a match has no video yet.
 *
 * Regenerate when new highlights are uploaded.
 */

export const MATCH_HIGHLIGHT_VIDEOS: Record<string, string> = {
  'ALG-AUT': 'yrKajdvVPyk', 'ALG-SUI': 'OiD2VT6E9pI', 'ARG-CPV': 'sRjVxphN65o',
  'ARG-JOR': 'DRCqjICeiqk', 'AUS-EGY': 'TE013AggjSU', 'AUT-ESP': 'o1oFmkRImGA',
  'BEL-NZL': 'YckNhPJH1pI', 'BEL-SEN': '0_DAO2xuTcM', 'BIH-USA': 'PfRjBY0mPps',
  'BRA-JPN': 'Lyyx84msPlk', 'BRA-NOR': 'N3UADgs2yRM', 'CAN-MAR': 'YV8EQudHp08',
  'CAN-RSA': 'NzUXPDeJJG8', 'COL-GHA': 'owTm9fFWKJE', 'COL-POR': 'VLuu6qnNqcA',
  'CPV-SAU': 'l_9BeeJBuK0', 'CRO-GHA': 'Ixhf1QRjCcY', 'CRO-POR': 'pyPjzLvgAiE',
  'CUR-IVC': 'OpZ0T5Z3o9s', 'DRC-ENG': 'sV3MP0OVszM', 'DRC-UZB': '3HkCADHisRQ',
  'ECU-GER': 'Owsexc3puKE', 'ECU-MEX': 'A_BDavl9ONo', 'EGY-IRN': 'PKbHiyLcWag',
  'ENG-MEX': 'oYmrnw1xavw', 'ENG-PAN': 'PUCsceX23u0', 'ESP-URU': 'fkzfTJaJCaA',
  'FRA-NOR': '5QlgJrKRaKk', 'FRA-PAR': 'v49zTAr3Ypo', 'FRA-SWE': 'HOhbzReQL7Y',
  'GER-PAR': 'vKUKKMUyE0s', 'IVC-NOR': 'dS6_g8FJm-k', 'JPN-SWE': 'T1f0AgAlIOw',
  'MAR-NED': 'MRgigX2gfws', 'TUR-USA': 'iaxZtavwro8',
}

/** Team code → Indonesian country name, as FolaPlay titles them. */
export const TEAM_NAME_ID: Record<string, string> = {
  ALG: 'Algeria', ARG: 'Argentina', AUS: 'Australia', AUT: 'Austria',
  BEL: 'Belgia', BIH: 'Bosnia', BRA: 'Brasil', CAN: 'Kanada', COL: 'Kolombia',
  CPV: 'Tanjung Verde', CRO: 'Kroasia', CUR: 'Curacao', CZE: 'Ceko',
  DRC: 'RD Kongo', ECU: 'Ekuador', EGY: 'Mesir', ENG: 'Inggris', ESP: 'Spanyol',
  FRA: 'Prancis', GER: 'Jerman', GHA: 'Ghana', HAI: 'Haiti', IRN: 'Iran',
  IRQ: 'Irak', IVC: 'Pantai Gading', JOR: 'Jordania', JPN: 'Jepang',
  KOR: 'Korea Selatan', MAR: 'Maroko', MEX: 'Meksiko', NED: 'Belanda',
  NOR: 'Norwegia', NZL: 'Selandia Baru', PAN: 'Panama', PAR: 'Paraguay',
  POR: 'Portugal', QAT: 'Qatar', RSA: 'Afrika Selatan', SAU: 'Arab Saudi',
  SCO: 'Skotlandia', SEN: 'Senegal', SUI: 'Swiss', SWE: 'Swedia', TUN: 'Tunisia',
  TUR: 'Turki', URU: 'Uruguay', USA: 'Amerika Serikat', UZB: 'Uzbekistan',
}
