declare module 'zod-form-react' {
  import { ZodSchema } from 'zod';
  import React from 'react';

  export interface ZodFormReactProps {
    schema: ZodSchema<any>;
    onSubmit: (data: any) => void;
    onCancel?: () => void;
    submitText?: string;
    cancelText?: string;
    disabled?: boolean;
    className?: Record<string, string>;
    theme?: 'light' | 'dark';
  }

  export const ZodFormReact: React.FC<ZodFormReactProps>;
}
