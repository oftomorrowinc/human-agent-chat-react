import { z } from 'zod';
// Define ZodTypeAny for ts-error workarounds
type ZodTypeAny = z.ZodType<any, any, any>;

/**
 * Generates an interactive form UI from a Zod schema
 * @param container DOM element to render the form into
 * @param schema Zod schema defining the form structure
 * @param onSubmit Callback function called with form data on submission
 */
export function generateForm(
  container: HTMLElement,
  schema: z.ZodObject<any, any, any> | any,
  onSubmit: (data: any) => void
): void {
  // Create form element
  const form = document.createElement('form');
  form.className = 'zod-form';
  container.appendChild(form);

  // Generate form fields based on schema shape
  if (
    schema &&
    typeof schema === 'object' &&
    '_def' in schema &&
    schema._def &&
    typeof schema._def === 'object' &&
    'shape' in schema._def &&
    typeof schema._def.shape === 'function'
  ) {
    const shape = schema._def.shape();
    const fields = Object.entries(shape);

    fields.forEach(([fieldName, fieldSchema]) => {
      const fieldContainer = document.createElement('div');
      fieldContainer.className = 'form-field';
      form.appendChild(fieldContainer);

      // Create label
      const label = document.createElement('label');
      label.htmlFor = fieldName;
      label.textContent = formatFieldName(fieldName);

      // Check if field is required
      if (!isOptional(fieldSchema as ZodTypeAny)) {
        const required = document.createElement('span');
        required.className = 'required-marker';
        required.textContent = '*';
        label.appendChild(required);
      }

      fieldContainer.appendChild(label);

      // Create the input based on field type
      const input = createInputForSchema(fieldName, fieldSchema as ZodTypeAny);
      fieldContainer.appendChild(input);

      // Add description if available
      const description = getDescription(fieldSchema as ZodTypeAny);
      if (description) {
        const descElement = document.createElement('div');
        descElement.className = 'field-description';
        descElement.textContent = description;
        fieldContainer.appendChild(descElement);
      }

      // Add error container
      const errorContainer = document.createElement('div');
      errorContainer.className = 'field-error';
      errorContainer.id = `${fieldName}-error`;
      fieldContainer.appendChild(errorContainer);
    });
  }

  // Add submit button
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'form-submit-btn';
  submitButton.textContent = 'Submit';
  form.appendChild(submitButton);

  // Handle form submission
  form.addEventListener('submit', event => {
    event.preventDefault();

    // Clear previous errors
    clearErrors(form);

    // Collect form data
    const formData = new FormData(form);
    const data: Record<string, any> = {};

    // Check if we have fields from schema
    if (
      schema &&
      typeof schema === 'object' &&
      '_def' in schema &&
      schema._def &&
      typeof schema._def === 'object' &&
      'shape' in schema._def &&
      typeof schema._def.shape === 'function'
    ) {
      const fields = Object.entries(schema._def.shape());

      fields.forEach(([fieldName, fieldSchema]) => {
        const value = formData.get(fieldName);

        // Convert value based on schema type
        data[fieldName] = convertValueForSchema(
          value,
          fieldSchema as ZodTypeAny
        );
      });
    }

    // Validate data against schema
    const result = schema.safeParse(data);

    if (result.success) {
      // Form is valid, call onSubmit callback
      onSubmit(result.data);
    } else {
      // Show validation errors
      const errors = result.error.errors;
      errors.forEach((error: { path: string[]; message: string }) => {
        const path = error.path.join('.');
        const errorContainer = document.getElementById(`${path}-error`);
        if (errorContainer) {
          errorContainer.textContent = error.message;
        }
      });
    }
  });
}

/**
 * Creates appropriate input element based on schema type
 * @param fieldName Name of the field
 * @param schema Zod schema for the field
 * @returns HTML input element
 */
function createInputForSchema(
  fieldName: string,
  schema: ZodTypeAny
): HTMLElement {
  // Check if this is a string field
  if (schema instanceof z.ZodString) {
    // Check for specific string formats
    if (schema._def.checks) {
      for (const check of schema._def.checks) {
        // Email input
        if (check.kind === 'email') {
          return createBasicInput('email', fieldName);
        }
        // URL input
        if (check.kind === 'url') {
          return createBasicInput('url', fieldName);
        }
        // Min/max length for textarea
        if (check.kind === 'min' && check.value > 100) {
          return createTextarea(fieldName);
        }
      }
    }
    return createBasicInput('text', fieldName);
  }

  // Number input
  if (schema instanceof z.ZodNumber) {
    return createBasicInput('number', fieldName);
  }

  // Boolean input (checkbox)
  if (schema instanceof z.ZodBoolean) {
    return createCheckbox(fieldName);
  }

  // Date input
  if (schema instanceof z.ZodDate) {
    return createBasicInput('date', fieldName);
  }

  // Enum input (select)
  if (schema instanceof z.ZodEnum) {
    return createSelect(fieldName, schema._def.values);
  }

  // Nullable or optional types
  if (schema instanceof z.ZodNullable || schema instanceof z.ZodOptional) {
    return createInputForSchema(fieldName, schema.unwrap());
  }

  // Default to text input
  return createBasicInput('text', fieldName);
}

/**
 * Creates a basic input element
 * @param type Input type
 * @param name Input name
 * @returns HTML input element
 */
function createBasicInput(type: string, name: string): HTMLInputElement {
  const input = document.createElement('input');
  input.type = type;
  input.name = name;
  input.id = name;
  return input;
}

/**
 * Creates a textarea element
 * @param name Textarea name
 * @returns HTML textarea element
 */
function createTextarea(name: string): HTMLTextAreaElement {
  const textarea = document.createElement('textarea');
  textarea.name = name;
  textarea.id = name;
  textarea.rows = 4;
  return textarea;
}

/**
 * Creates a checkbox element
 * @param name Checkbox name
 * @returns HTML div containing checkbox element
 */
function createCheckbox(name: string): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'checkbox-container';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.name = name;
  checkbox.id = name;

  container.appendChild(checkbox);
  return container;
}

/**
 * Creates a select element with options
 * @param name Select name
 * @param options Array of option values
 * @returns HTML select element
 */
function createSelect(name: string, options: string[]): HTMLSelectElement {
  const select = document.createElement('select');
  select.name = name;
  select.id = name;

  // Add placeholder option
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = `Select ${formatFieldName(name)}`;
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  // Add options from enum
  options.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  return select;
}

/**
 * Converts form value to appropriate type based on schema
 * @param value Form field value
 * @param schema Zod schema for the field
 * @returns Converted value
 */
function convertValueForSchema(
  value: FormDataEntryValue | null,
  schema: ZodTypeAny
): any {
  if (value === null) {
    return null;
  }

  // Convert string value to appropriate type
  if (schema instanceof z.ZodNumber) {
    return value === '' ? null : Number(value);
  }

  if (schema instanceof z.ZodBoolean) {
    return value === 'on';
  }

  if (schema instanceof z.ZodDate) {
    return value === '' ? null : new Date(value.toString());
  }

  // Handle nested schemas
  if (schema instanceof z.ZodNullable || schema instanceof z.ZodOptional) {
    return value === '' ? null : convertValueForSchema(value, schema.unwrap());
  }

  // Default to string
  return value.toString();
}

/**
 * Formats a field name for display
 * @param name Field name
 * @returns Formatted name
 */
function formatFieldName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
}

/**
 * Checks if a schema field is optional
 * @param schema Field schema
 * @returns Boolean indicating if field is optional
 */
function isOptional(schema: ZodTypeAny): boolean {
  return schema instanceof z.ZodOptional || schema instanceof z.ZodNullable;
}

/**
 * Gets field description from schema metadata
 * @param schema Field schema
 * @returns Description string or null
 */
function getDescription(schema: ZodTypeAny): string | null {
  // Check if schema has description metadata
  if (schema._def.description) {
    return schema._def.description;
  }

  // Check for nested schemas
  if (schema instanceof z.ZodNullable || schema instanceof z.ZodOptional) {
    return getDescription(schema.unwrap());
  }

  return null;
}

/**
 * Clears all error messages in a form
 * @param form Form element
 */
function clearErrors(form: HTMLFormElement): void {
  const errorElements = form.querySelectorAll('.field-error');
  errorElements.forEach(element => {
    element.textContent = '';
  });
}

/**
 * Creates a modal form that can be shown and hidden
 * @param schema Zod schema defining the form structure
 * @param onSubmit Callback function called with form data on submission
 * @returns Object with show and hide functions
 */
export function createModalForm(
  schema: z.ZodObject<any, any, any> | any,
  onSubmit: (data: any) => void
): { show: () => void; hide: () => void } {
  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'zod-form-modal';
  modal.style.display = 'none';
  document.body.appendChild(modal);

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'zod-form-modal-content';
  modal.appendChild(modalContent);

  // Create close button
  const closeButton = document.createElement('button');
  closeButton.className = 'modal-close-btn';
  closeButton.innerHTML = '&times;';
  closeButton.onclick = () => hide();
  modalContent.appendChild(closeButton);

  // Create form title
  const title = document.createElement('h3');
  title.className = 'form-title';
  title.textContent = 'Form';
  modalContent.appendChild(title);

  // Generate form
  generateForm(modalContent, schema, data => {
    onSubmit(data);
    hide();
  });

  // Show modal function
  function show(): void {
    modal.style.display = 'flex';
  }

  // Hide modal function
  function hide(): void {
    modal.style.display = 'none';
  }

  // Close modal when clicking outside
  modal.onclick = event => {
    if (event.target === modal) {
      hide();
    }
  };

  return { show, hide };
}
