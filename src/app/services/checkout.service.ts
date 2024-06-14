import { Injectable } from '@angular/core';
// @ts-ignore
import MD5 from "crypto-js/md5";

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {

  // @ts-ignore
  public merchantId = 'change me to your merchant id'
  public hashKey = 'change me to your hash key'
  public passcode = 'change me to your passcode'
  public apiPasscode = 'change me to your api passcode'

  public url = 'https://web.na.bambora.com/scripts/payment/payment.asp';

  public baseUrl = 'https://api.na.bambora.com/v1';

  public subObjects = ['order', 'billing', 'shipping'];

  public skipUrlEncode = ['trnAmount'];

  constructor() { }

  createHashValue(params: any = null) {
    let queryParamString = '';
    if (params) {
      const flattenedObj = this.flattenObject(params);
      for (let key in flattenedObj) {
        let value = flattenedObj[key];
        if (!this.skipUrlEncode.includes(key)) {
          value = encodeURIComponent(value);
        }
        queryParamString += `&${key}=${value}`;
      }
    }
    let hashValue = MD5(`merchant_id=${this.merchantId}${queryParamString}${this.hashKey}`).toString();
    return hashValue;
  }

  getCheckoutUrl(params: any = null) {
    let url = `${this.url}?merchant_id=${this.merchantId}`;
    const flattenedObj = this.flattenObject(params);
    for (let key in flattenedObj) {
      let value = flattenedObj[key];
      if (!this.skipUrlEncode.includes(key)) {
        value = encodeURIComponent(value);
      }
      url += `&${key}=${value}`;
    }
    url += `&hashValue=${this.createHashValue(params)}`;
    return url;
  }

  flattenObject(obj: any, list: any = {}) {
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.flattenObject(obj[key], list);
      } else if (obj[key] !== null) {
        list[key] = obj[key];
      }
    }
    return list;
  }

  async submitPaymentRequest(params: any, method: any, amount: any = null,) {
    let request: any = {
      amount: amount || params?.order?.trnAmount,
      payment_method: method,
      language: params?.order?.trnLanguage,
      billing: {
        name: params?.order?.trnCardOwner || params?.billing?.ordName,
        address_line1: params?.billing?.ordAddress1,
        address_line2: params?.billing?.ordAddress2,
        city: params?.billing?.ordCity,
        province: params?.billing?.ordProvince,
        postal_code: params?.billing?.ordPostalCode,
        country: params?.billing?.ordCountry,
        phone_number: params?.shipping?.shipPhoneAddress,
        email: params?.shipping?.shipEmailAddress
      },
      shipping: {
        name: params?.shipping?.shipName,
        address_line1: params?.shipping?.shipAddress1,
        address_line2: params?.shipping?.shipAddress2,
        city: params?.shipping?.shipCity,
        province: params?.shipping?.shipProvince,
        postal_code: params?.shipping?.shipPostalCode,
        country: params?.shipping?.shipCountry,
        phone_number: params?.shipping?.shipPhoneAddress,
        email: params?.shipping?.shipEmailAddress
      }
    };
    if (method === 'token') {
      request['token'] = {
        complete: params?.order?.trnType === 'PA' ? false : true,
        code: params?.token?.token,
        name: params?.order?.trnCardOwner || params?.billing?.ordName,
      };
    }
    request = JSON.parse(JSON.stringify(request, (key, value) => {
      if (value === null) {
        return undefined;
      }
      return value;
    }));

    let res = await fetch(`${this.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Passcode ${this.getAuth()}`
      },
      body: JSON.stringify(request)
    });
    return await res.json();

  }

  getAuth() {
    return btoa(`${this.merchantId}:${this.apiPasscode}`);
  }

  getProfileAuth() {
    return btoa(`${this.merchantId}:${this.passcode}`);
  }

  async createPaymentProfile(data: any = null) {
    let request: any = {};
    try {
      request = {
        token: {
          name: data?.order?.trnCardOwner,
          code: data?.token?.token
        }
      };
      if (data?.billing) {
        request['billing'] = {
          address_line1: data?.billing?.ordAddress1,
          address_line2: data?.billing?.ordAddress2,
          city: data?.billing?.ordCity,
          province: data?.billing?.ordProvince,
          postal_code: data?.billing?.ordPostalCode,
          country: data?.billing?.ordCountry,
        };
      }
      if (data?.shipping) {
        const shippingData = {
          phone_number: data?.shipping?.shipPhoneAddress,
          email_address: data?.shipping?.shipEmailAddress
        };
        request['billing'] = { ...request['billing'], ...shippingData };
      }
      // request['language'] = data?.order?.trnLanguage || 'eng';
    } catch (error) {
    }

    let res = await fetch(`${this.baseUrl}/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Passcode ${this.getProfileAuth()}`
      },
      body: JSON.stringify(request)
    });
    return await res.json();
  }

}