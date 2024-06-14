# Setup for Payment Processor POC

This POC handles test payments for Stripe and Bambora. It was made to investigate how a public facing payment terminal could be connected to a payment processing server, and to show how data might flow from the front end into an administrative portal. A practical implementation of such a payment terminal may look different or be handled differently.

You will need test accounts in each respective processor's administrative portal to run this POC.

## Bambora

You will need the following information from Bambora:

* merchant id
* payment gateway hash key
* payment profile access passcode
* api access passcode

Obtain these values from the Bambora admin portal and update the respective values in `data.service.js`

## Stripe

You will need the following information from Stripe

* public key (test account)
* secret key (test account)

Obtain these values from the Stripe testing admin portal and update the respective values in `stripe-checkout.component.ts`