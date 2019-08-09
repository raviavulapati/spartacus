import * as login from '../../../helpers/login';
import * as paymentMethods from '../../../helpers/payment-methods';
import { generateMail } from '../../../helpers/user';
import { standardUser } from '../../../sample-data/shared-users';
import { formats } from '../../../sample-data/viewports';

const checkAnonymous = () => {
  it('should redirect to login page for anonymouse user', () => {
    paymentMethods.accessPageAsAnonymous();
  });
};

const paymentMethodsTest = () => {
  it('should see title and some messages', () => {
    paymentMethods.verifyText();
  });

  it('should see payment method card', () => {
    paymentMethods.paymentDetailCard();
  });

  it('should be able to add a second payment card', () => {
    paymentMethods.addSecondaryPaymentCard();
  });

  it('should be able to set secondary card as default', () => {
    paymentMethods.setSecondPaymentToDefault();
  });

  it('should be able to delete the payment', () => {
    paymentMethods.deletePayment();
  });
};

// desktop
describe('Payment Methods', () => {
  before(() => {
    cy.window().then(win => win.sessionStorage.clear());
    cy.deleteLocalStorage();
  });

  checkAnonymous();

  describe('should go to payment details page for login user', () => {
    before(() => {
      standardUser.registrationData.email = generateMail('desktop', true);
      cy.requireLoggedIn(standardUser);
      cy.reload();
      cy.visit('/');
      cy.selectUserMenuOption({
        option: 'Payment Details',
      });
    });

    beforeEach(() => {
      cy.restoreLocalStorage();
    });

    paymentMethodsTest();

    afterEach(() => {
      cy.saveLocalStorage();
    });

    after(() => {
      login.signOutUser();
    });
  });
});

// mobile
describe(`${formats.mobile.width + 1}p resolution - Payment Methods`, () => {
  before(() => {
    cy.window().then(win => win.sessionStorage.clear());
    cy.deleteLocalStorage();
    cy.viewport(formats.mobile.width, formats.mobile.height);
  });

  beforeEach(() => {
    cy.viewport(formats.mobile.width, formats.mobile.height);
  });

  checkAnonymous();

  describe('should go to payment details page for login user', () => {
    before(() => {
      standardUser.registrationData.email = generateMail('mobile', true);
      cy.requireLoggedIn(standardUser);
      cy.reload();
      cy.visit('/');
      cy.selectUserMenuOption({
        option: 'Payment Details',
        isMobile: true,
      });
    });

    beforeEach(() => {
      cy.restoreLocalStorage();
    });

    paymentMethodsTest();

    afterEach(() => {
      cy.saveLocalStorage();
    });

    after(() => {
      login.signOutUser();
    });
  });
});
