import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { Config, provideDefaultConfig } from '../config/config.module';
import { AsmConfig } from './config/asm-config';
import { defaultAsmConfig } from './config/default-asm-config';
import { AsmStoreModule } from './store/asm-store.module';
import { interceptors } from './http-interceptors/index';

@NgModule({
  imports: [CommonModule, HttpClientModule, AsmStoreModule],
})
export class AsmModule {
  static forRoot(): ModuleWithProviders<AsmModule> {
    return {
      ngModule: AsmModule,
      providers: [
        { provide: AsmConfig, useExisting: Config },
        ...interceptors,
        provideDefaultConfig(defaultAsmConfig),
      ],
    };
  }
}
