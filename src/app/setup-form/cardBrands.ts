// https://dev.na.bambora.com/docs/references/payment_APIs/test_cards/ <-- Bambora test cards

export interface cardBrand {
  id: string;
  name: string;
  approvedNumber: string;
  declinedNumber: string;
  cvv: string;
  icon?: string;
  timeoutApprovedNumber?: string;
  timeoutDeclinedNumber?: string;
  noResponseErrorDeclinedNumber?: string;
  visaTimeoutErrorDeclinedNumber?: string;
  noDeviceErrorDeclinedNumber?: string;
}

export const cardBrands: cardBrand[] = [
  {
    id: 'visa',
    name: 'Visa',
    approvedNumber: '4030000010001234',
    declinedNumber: '4003050500040005',
    cvv: '123',
    icon: 'https://cdn.na.bambora.com/downloads/images/cards/visa.svg',
    timeoutApprovedNumber: '4485349439401891',
    timeoutDeclinedNumber: '4539939815032280',
    noResponseErrorDeclinedNumber: '4872385877270993',
    visaTimeoutErrorDeclinedNumber: '4294215026184763',
    noDeviceErrorDeclinedNumber: '4104631199283796'
  },
  {
    id: 'mastercard',
    name: 'Mastercard',
    approvedNumber: '5100000010001004',
    declinedNumber: '5100000020002000',
    cvv: '123',
    icon: 'https://cdn.na.bambora.com/downloads/images/cards/mastercard.svg',
    timeoutApprovedNumber: '5396191225134160',
    timeoutDeclinedNumber: '5366520542338805'
  },
  {
    id: 'amex',
    name: 'American Express',
    approvedNumber: '371100001000131',
    declinedNumber: '342400001000180',
    cvv: '1234',
    icon: 'https://cdn.na.bambora.com/downloads/images/cards/amex.svg',
  },
  {
    id: 'discover',
    name: 'Discover',
    approvedNumber: '6011500080009080',
    declinedNumber: '6011000900901111',
    cvv: '123',
    icon: 'https://cdn.na.bambora.com/downloads/images/cards/discover.svg',
  }
];

export default { cardBrands }