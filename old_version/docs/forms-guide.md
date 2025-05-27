# Dynamic Forms with Zod

HumanAgentChat includes a powerful form generation system based on Zod schemas. This allows you to create interactive forms that can be displayed as modals or inline within the chat interface.

## Overview

The form generation system:

1. Takes a Zod schema as input
2. Generates appropriate form fields based on the schema's types and constraints
3. Handles validation according to Zod's rules
4. Returns validated data to your callback function

## Basic Usage

### Creating a Simple Form

```javascript
import { z } from 'zod';
import { generateForm } from 'human-agent-chat';

// Define your form schema using Zod
const contactFormSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  message: z.string().min(10).max(1000),
  priority: z.enum(['Low', 'Medium', 'High']),
  subscribe: z.boolean().default(false)
});

// Generate the form
const formContainer = document.getElementById('form-container');
generateForm(formContainer, contactFormSchema, (data) => {
  console.log('Form submitted:', data);
  // Process the validated form data
});
```

### Creating a Modal Form

```javascript
import { z } from 'zod';
import { createModalForm } from 'human-agent-chat';

// Define your form schema
const surveyFormSchema = z.object({
  satisfaction: z.number().min(1).max(5).describe('Rate your satisfaction (1-5)'),
  feedback: z.string().min(10).optional().describe('Optional feedback'),
  wouldRecommend: z.boolean().describe('Would you recommend our service?')
});

// Create a modal form
const modal = createModalForm(surveyFormSchema, (data) => {
  console.log('Survey submitted:', data);
  // Process the validated form data
});

// Show the form when needed
document.getElementById('open-survey-btn').addEventListener('click', () => {
  modal.show();
});
```

## Sending Forms in Chat

Forms can be sent as messages in the chat:

```javascript
// Send a form as a message
await chatInstance.sendCustomMessage({
  type: 'form',
  value: surveyFormSchema,
  caption: 'Please fill out our survey'
});

// Handle form submission
chatInstance.onNewMessage = (message) => {
  if (message.content.type === 'form_response' && 
      message.content.value.formId === 'survey') {
    console.log('Survey response:', message.content.value.values);
  }
};
```

## Advanced Form Schema Features

### Field Descriptions

Use Zod's `.describe()` method to add helpful text to fields:

```javascript
const schema = z.object({
  apiKey: z.string().describe('Your API key from the developer dashboard'),
  attempts: z.number().min(1).max(10).describe('Number of retry attempts (1-10)')
});
```

### Required vs. Optional Fields

By default, all fields in a Zod object are required. Use `.optional()` to make fields optional:

```javascript
const schema = z.object({
  name: z.string(),                // Required
  title: z.string().optional(),    // Optional
  company: z.string().optional()   // Optional
});
```

Required fields are marked with an asterisk (*) in the rendered form.

### Default Values

Set default values for fields:

```javascript
const schema = z.object({
  theme: z.enum(['light', 'dark']).default('dark'),
  notifications: z.boolean().default(true),
  refreshInterval: z.number().default(60)
});
```

### Field Constraints

Zod provides many ways to constrain fields:

```javascript
const schema = z.object({
  username: z.string().min(3).max(20),
  age: z.number().min(18).max(120),
  email: z.string().email(),
  website: z.string().url().optional(),
  zipCode: z.string().regex(/^\d{5}$/)
});
```

## Form Field Types

The form generator creates appropriate HTML inputs based on the Zod schema types:

| Zod Type | HTML Input |
|----------|------------|
| `z.string()` | `<input type="text">` |
| `z.string().email()` | `<input type="email">` |
| `z.string().url()` | `<input type="url">` |
| `z.string()` with length > 100 | `<textarea>` |
| `z.number()` | `<input type="number">` |
| `z.boolean()` | `<input type="checkbox">` |
| `z.date()` | `<input type="date">` |
| `z.enum([...])` | `<select>` with options |

## Styling Forms

Forms are styled using the CSS classes defined in `human-agent-chat.css`. You can override these styles in your own CSS:

```css
/* Example custom styles */
.zod-form {
  /* Form container */
}

.form-field {
  /* Field container */
}

.field-description {
  /* Help text */
}

.field-error {
  /* Validation error message */
}

.form-submit-btn {
  /* Submit button */
}
```

## Form Validation

Validation is automatically handled based on the Zod schema:

1. When the form is submitted, each field is validated against the schema
2. If validation fails, error messages are displayed below the fields
3. If validation succeeds, the callback function is called with the validated data

## Handling Form Responses

When using forms in chat messages, form responses are sent as new messages with a reference to the original form:

```javascript
// Listen for form responses
chatInstance.onNewMessage = (message) => {
  if (message.content.type === 'form_response') {
    const { formId, values } = message.content.value;
    console.log(`Response to form ${formId}:`, values);
    
    // Handle different form types
    switch (formId) {
      case 'feedback':
        handleFeedbackSubmission(values);
        break;
      case 'order':
        processOrder(values);
        break;
    }
  }
};
```

## Best Practices

1. **Clear Field Labels**: Zod field names are converted to labels (e.g., `firstName` becomes "First Name")
2. **Add Descriptions**: Use `.describe()` to add helpful text for complex fields
3. **Set Constraints**: Use Zod's validators to set appropriate constraints
4. **Handle Errors Gracefully**: Provide clear error messages for validation failures
5. **Respect Privacy**: Only collect information you need
6. **Test Your Forms**: Ensure your forms work correctly with valid and invalid input

## Complete Example

```javascript
import { z } from 'zod';
import { generateForm } from 'human-agent-chat';

// Define your form schema
const productOrderSchema = z.object({
  productName: z.string().min(2).max(100).describe('Name of the product'),
  quantity: z.number().int().positive().max(100).describe('Number of units (max 100)'),
  color: z.enum(['Red', 'Blue', 'Green', 'Black', 'White']),
  size: z.enum(['S', 'M', 'L', 'XL', 'XXL']).optional(),
  shippingAddress: z.string().min(10).max(200).describe('Full shipping address'),
  expedited: z.boolean().default(false).describe('Choose expedited shipping'),
  notes: z.string().max(500).optional().describe('Special instructions (optional)')
});

// Generate the form
const formContainer = document.getElementById('order-form');
generateForm(formContainer, productOrderSchema, (data) => {
  // Process the order
  console.log('Order submitted:', data);
  
  // Show confirmation
  formContainer.innerHTML = `
    <div class="order-confirmation">
      <h3>Order Received!</h3>
      <p>Your order for ${data.quantity} ${data.productName} has been submitted.</p>
      <p>It will be shipped to the address you provided.</p>
    </div>
  `;
});
```