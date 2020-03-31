import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { from, Observable, of } from 'rxjs';
import {
  catchError,
  concatMap,
  filter,
  map,
  mergeMap,
  switchMap,
} from 'rxjs/operators';
import { AuthActions } from '../../../auth/store/actions/index';
import * as DeprecatedCartActions from '../../../cart/store/actions/cart.action';
import { CartActions } from '../../../cart/store/actions/index';
import { CheckoutDetails } from '../../../checkout/models/checkout.model';
import { GlobalMessageActions } from '../../../global-message/store/actions/index';
import {
  OCC_CART_ID_CURRENT,
  OCC_USER_ID_ANONYMOUS,
} from '../../../occ/utils/occ-constants';
import { SiteContextActions } from '../../../site-context/store/actions/index';
import { UserActions } from '../../../user/store/actions/index';
import { makeErrorSerializable } from '../../../util/serialization-utils';
import { withdrawOn } from '../../../util/withdraw-on';
import { CheckoutConnector } from '../../connectors/checkout/checkout.connector';
import { CheckoutDeliveryConnector } from '../../connectors/delivery/checkout-delivery.connector';
import { CheckoutPaymentConnector } from '../../connectors/payment/checkout-payment.connector';
import { CheckoutActions } from '../actions/index';

@Injectable()
export class CheckoutEffects {
  private contextChange$ = this.actions$.pipe(
    ofType(
      SiteContextActions.CURRENCY_CHANGE,
      SiteContextActions.LANGUAGE_CHANGE
    )
  );

  @Effect()
  addDeliveryAddress$: Observable<
    | UserActions.LoadUserAddresses
    | CheckoutActions.SetDeliveryAddress
    | CheckoutActions.AddDeliveryAddressFail
  > = this.actions$.pipe(
    ofType(CheckoutActions.ADD_DELIVERY_ADDRESS),
    map((action: CheckoutActions.AddDeliveryAddress) => action.payload),
    mergeMap((payload) =>
      this.checkoutDeliveryConnector
        .createAddress(payload.userId, payload.cartId, payload.address)
        .pipe(
          mergeMap((address) => {
            address['titleCode'] = payload.address.titleCode;
            if (payload.address.region && payload.address.region.isocodeShort) {
              Object.assign(address.region, {
                isocodeShort: payload.address.region.isocodeShort,
              });
            }
            if (payload.userId === OCC_USER_ID_ANONYMOUS) {
              return [
                new CheckoutActions.SetDeliveryAddress({
                  userId: payload.userId,
                  cartId: payload.cartId,
                  address: address,
                }),
              ];
            } else {
              return [
                new UserActions.LoadUserAddresses(payload.userId),
                new CheckoutActions.SetDeliveryAddress({
                  userId: payload.userId,
                  cartId: payload.cartId,
                  address: address,
                }),
              ];
            }
          }),
          catchError((error) =>
            of(
              new CheckoutActions.AddDeliveryAddressFail(
                makeErrorSerializable(error)
              )
            )
          )
        )
    ),
    withdrawOn(this.contextChange$)
  );

  @Effect()
  setDeliveryAddress$: Observable<
    | CheckoutActions.SetDeliveryAddressSuccess
    | CheckoutActions.ClearSupportedDeliveryModes
    | CheckoutActions.ClearCheckoutDeliveryMode
    | CheckoutActions.ResetLoadSupportedDeliveryModesProcess
    | CheckoutActions.LoadSupportedDeliveryModes
    | CheckoutActions.SetDeliveryAddressFail
  > = this.actions$.pipe(
    ofType(CheckoutActions.SET_DELIVERY_ADDRESS),
    map((action: any) => action.payload),
    mergeMap((payload) => {
      return this.checkoutDeliveryConnector
        .setAddress(payload.userId, payload.cartId, payload.address.id)
        .pipe(
          mergeMap(() => [
            new CheckoutActions.SetDeliveryAddressSuccess(payload.address),
            new CheckoutActions.ClearCheckoutDeliveryMode({
              userId: payload.userId,
              cartId: payload.cartId,
            }),
            new CheckoutActions.ClearSupportedDeliveryModes(),
            new CheckoutActions.ResetLoadSupportedDeliveryModesProcess(),
            new CheckoutActions.LoadSupportedDeliveryModes({
              userId: payload.userId,
              cartId: payload.cartId,
            }),
          ]),
          catchError((error) =>
            of(
              new CheckoutActions.SetDeliveryAddressFail(
                makeErrorSerializable(error)
              )
            )
          )
        );
    }),
    withdrawOn(this.contextChange$)
  );

  @Effect()
  loadSupportedDeliveryModes$: Observable<
    | CheckoutActions.LoadSupportedDeliveryModesSuccess
    | CheckoutActions.LoadSupportedDeliveryModesFail
  > = this.actions$.pipe(
    ofType(CheckoutActions.LOAD_SUPPORTED_DELIVERY_MODES),
    map((action: any) => action.payload),
    mergeMap((payload) => {
      return this.checkoutDeliveryConnector
        .getSupportedModes(payload.userId, payload.cartId)
        .pipe(
          map((data) => {
            return new CheckoutActions.LoadSupportedDeliveryModesSuccess(data);
          }),
          catchError((error) =>
            of(
              new CheckoutActions.LoadSupportedDeliveryModesFail(
                makeErrorSerializable(error)
              )
            )
          )
        );
    }),
    withdrawOn(this.contextChange$)
  );

  @Effect()
  clearCheckoutMiscsDataOnLanguageChange$: Observable<
    | CheckoutActions.CheckoutClearMiscsData
    | CheckoutActions.ResetLoadSupportedDeliveryModesProcess
  > = this.actions$.pipe(
    ofType(SiteContextActions.LANGUAGE_CHANGE),
    mergeMap(() => [
      new CheckoutActions.CheckoutClearMiscsData(),
      new CheckoutActions.ResetLoadSupportedDeliveryModesProcess(),
    ])
  );

  @Effect()
  clearDeliveryModesOnCurrencyChange$: Observable<
    CheckoutActions.ClearSupportedDeliveryModes
  > = this.actions$.pipe(
    ofType(SiteContextActions.CURRENCY_CHANGE),
    map(() => new CheckoutActions.ClearSupportedDeliveryModes())
  );

  @Effect()
  clearCheckoutDataOnLogout$: Observable<
    CheckoutActions.ClearCheckoutData
  > = this.actions$.pipe(
    ofType(AuthActions.LOGOUT),
    map(() => new CheckoutActions.ClearCheckoutData())
  );

  @Effect()
  clearCheckoutDataOnLogin$: Observable<
    CheckoutActions.ClearCheckoutData
  > = this.actions$.pipe(
    ofType(AuthActions.LOGIN),
    map(() => new CheckoutActions.ClearCheckoutData())
  );

  @Effect()
  setDeliveryMode$: Observable<
    | CheckoutActions.SetDeliveryModeSuccess
    | CheckoutActions.SetDeliveryModeFail
    | DeprecatedCartActions.LoadCart
  > = this.actions$.pipe(
    ofType(CheckoutActions.SET_DELIVERY_MODE),
    map((action: any) => action.payload),
    mergeMap((payload) => {
      return this.checkoutDeliveryConnector
        .setMode(payload.userId, payload.cartId, payload.selectedModeId)
        .pipe(
          mergeMap(() => {
            return [
              new CheckoutActions.SetDeliveryModeSuccess(
                payload.selectedModeId
              ),
              new DeprecatedCartActions.LoadCart({
                userId: payload.userId,
                cartId: payload.cartId,
              }),
            ];
          }),
          catchError((error) =>
            of(
              new CheckoutActions.SetDeliveryModeFail(
                makeErrorSerializable(error)
              )
            )
          )
        );
    }),
    withdrawOn(this.contextChange$)
  );

  @Effect()
  createPaymentDetails$: Observable<
    | UserActions.LoadUserPaymentMethods
    | CheckoutActions.CreatePaymentDetailsSuccess
    | CheckoutActions.CreatePaymentDetailsFail
  > = this.actions$.pipe(
    ofType(CheckoutActions.CREATE_PAYMENT_DETAILS),
    map((action: any) => action.payload),
    mergeMap((payload) => {
      // get information for creating a subscription directly with payment provider
      return this.checkoutPaymentConnector
        .create(payload.userId, payload.cartId, payload.paymentDetails)
        .pipe(
          mergeMap((details) => {
            if (payload.userId === OCC_USER_ID_ANONYMOUS) {
              return [new CheckoutActions.CreatePaymentDetailsSuccess(details)];
            } else {
              return [
                new UserActions.LoadUserPaymentMethods(payload.userId),
                new CheckoutActions.CreatePaymentDetailsSuccess(details),
              ];
            }
          }),
          catchError((error) =>
            of(
              new CheckoutActions.CreatePaymentDetailsFail(
                makeErrorSerializable(error)
              )
            )
          )
        );
    }),
    withdrawOn(this.contextChange$)
  );

  @Effect()
  setPaymentDetails$: Observable<
    | CheckoutActions.SetPaymentDetailsSuccess
    | CheckoutActions.SetPaymentDetailsFail
  > = this.actions$.pipe(
    ofType(CheckoutActions.SET_PAYMENT_DETAILS),
    map((action: any) => action.payload),
    mergeMap((payload) => {
      return this.checkoutPaymentConnector
        .set(payload.userId, payload.cartId, payload.paymentDetails.id)
        .pipe(
          map(
            () =>
              new CheckoutActions.SetPaymentDetailsSuccess(
                payload.paymentDetails
              )
          ),
          catchError((error) =>
            of(
              new CheckoutActions.SetPaymentDetailsFail(
                makeErrorSerializable(error)
              )
            )
          )
        );
    }),
    withdrawOn(this.contextChange$)
  );

  @Effect()
  placeOrder$: Observable<
    | CheckoutActions.PlaceOrderSuccess
    | GlobalMessageActions.AddMessage
    | CheckoutActions.PlaceOrderFail
    | CartActions.RemoveCart
  > = this.actions$.pipe(
    ofType(CheckoutActions.PLACE_ORDER),
    map((action: any) => action.payload),
    mergeMap((payload) => {
      return this.checkoutConnector
        .placeOrder(payload.userId, payload.cartId)
        .pipe(
          switchMap((data) => [
            new CartActions.RemoveCart(payload.cartId),
            new CheckoutActions.PlaceOrderSuccess(data),
          ]),
          catchError((error) =>
            of(new CheckoutActions.PlaceOrderFail(makeErrorSerializable(error)))
          )
        );
    }),
    withdrawOn(this.contextChange$)
  );

  @Effect()
  loadCheckoutDetails$: Observable<
    | CheckoutActions.LoadCheckoutDetailsSuccess
    | CheckoutActions.LoadCheckoutDetailsFail
  > = this.actions$.pipe(
    ofType(CheckoutActions.LOAD_CHECKOUT_DETAILS),
    map((action: CheckoutActions.LoadCheckoutDetails) => action.payload),
    mergeMap((payload) => {
      return this.checkoutConnector
        .loadCheckoutDetails(payload.userId, payload.cartId)
        .pipe(
          map(
            (data: CheckoutDetails) =>
              new CheckoutActions.LoadCheckoutDetailsSuccess(data)
          ),
          catchError((error) =>
            of(
              new CheckoutActions.LoadCheckoutDetailsFail(
                makeErrorSerializable(error)
              )
            )
          )
        );
    }),
    withdrawOn(this.contextChange$)
  );

  @Effect()
  reloadDetailsOnMergeCart$: Observable<
    CheckoutActions.LoadCheckoutDetails
  > = this.actions$.pipe(
    ofType(DeprecatedCartActions.MERGE_CART_SUCCESS),
    map((action: DeprecatedCartActions.MergeCartSuccess) => action.payload),
    map((payload) => {
      return new CheckoutActions.LoadCheckoutDetails({
        userId: payload.userId,
        cartId: payload.cartId ? payload.cartId : OCC_CART_ID_CURRENT,
      });
    })
  );

  @Effect()
  clearCheckoutDeliveryAddress$: Observable<
    | CheckoutActions.ClearCheckoutDeliveryAddressFail
    | CheckoutActions.ClearCheckoutDeliveryAddressSuccess
  > = this.actions$.pipe(
    ofType(CheckoutActions.CLEAR_CHECKOUT_DELIVERY_ADDRESS),
    map(
      (action: CheckoutActions.ClearCheckoutDeliveryAddress) => action.payload
    ),
    filter((payload) => Boolean(payload.cartId)),
    switchMap((payload) => {
      return this.checkoutConnector
        .clearCheckoutDeliveryAddress(payload.userId, payload.cartId)
        .pipe(
          map(() => new CheckoutActions.ClearCheckoutDeliveryAddressSuccess()),
          catchError((error) =>
            of(
              new CheckoutActions.ClearCheckoutDeliveryAddressFail(
                makeErrorSerializable(error)
              )
            )
          )
        );
    }),
    withdrawOn(this.contextChange$)
  );

  @Effect()
  clearCheckoutDeliveryMode$: Observable<
    | CheckoutActions.ClearCheckoutDeliveryModeFail
    | CheckoutActions.ClearCheckoutDeliveryModeSuccess
    | CartActions.CartProcessesDecrement
    | CartActions.LoadCart
  > = this.actions$.pipe(
    ofType(CheckoutActions.CLEAR_CHECKOUT_DELIVERY_MODE),
    map((action: CheckoutActions.ClearCheckoutDeliveryMode) => action.payload),
    filter((payload) => Boolean(payload.cartId)),
    concatMap((payload) => {
      return this.checkoutConnector
        .clearCheckoutDeliveryMode(payload.userId, payload.cartId)
        .pipe(
          map(
            () =>
              new CheckoutActions.ClearCheckoutDeliveryModeSuccess({
                userId: payload.userId,
                cartId: payload.cartId,
              })
          ),
          catchError((error) =>
            from([
              new CheckoutActions.ClearCheckoutDeliveryModeFail(
                makeErrorSerializable(error)
              ),
              new CartActions.CartProcessesDecrement(payload.cartId),
              new CartActions.LoadCart({
                cartId: payload.cartId,
                userId: payload.userId,
              }),
            ])
          )
        );
    }),
    withdrawOn(this.contextChange$)
  );

  constructor(
    private actions$: Actions,
    private checkoutDeliveryConnector: CheckoutDeliveryConnector,
    private checkoutPaymentConnector: CheckoutPaymentConnector,
    private checkoutConnector: CheckoutConnector
  ) {}
}
