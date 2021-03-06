import { ComponentData } from '../../../shared/utils/file-utils';
import { ANONYMOUS_CONSENT_DIALOG_COMPONENT_MIGRATION } from './data/anonymous-consent-dialog.component.migration';
import { CONSENT_MANAGEMENT_FORM_COMPONENT_MIGRATION } from './data/consent-management-form.component.migration';
import { CONSENT_MANAGEMENT_COMPONENT_MIGRATION } from './data/consent-management.component.migration';
import { PRODUCT_IMAGES_COMPONENT_MIGRATION } from './data/product-images.component.migration';

export const COMPONENT_DEPRECATION_DATA: ComponentData[] = [
  CONSENT_MANAGEMENT_FORM_COMPONENT_MIGRATION,
  CONSENT_MANAGEMENT_COMPONENT_MIGRATION,
  PRODUCT_IMAGES_COMPONENT_MIGRATION,
  ANONYMOUS_CONSENT_DIALOG_COMPONENT_MIGRATION,
];
