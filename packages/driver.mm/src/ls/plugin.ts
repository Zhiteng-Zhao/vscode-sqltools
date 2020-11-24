import { ILanguageServerPlugin } from '@sqltools/types';
import MM from './driver';
import { DRIVER_ALIASES } from './../constants';

const MMDriverPlugin: ILanguageServerPlugin = {
  register(server) {
    DRIVER_ALIASES.forEach(({ value }) => {
      server.getContext().drivers.set(value, MM);
    });
  }
}

export default MMDriverPlugin;