import { z } from 'zod';
import { generateForm, createModalForm } from '../../src/utils/form-generator';

// Mock DOM elements and functions
document.getElementById = jest.fn();
document.createElement = jest.fn().mockImplementation(tag => {
  const element: any = {
    appendChild: jest.fn(),
    addEventListener: jest.fn(),
    style: {},
    classList: { add: jest.fn() },
    setAttribute: jest.fn(),
    querySelector: jest.fn().mockReturnValue(null),
    querySelectorAll: jest.fn().mockReturnValue([]),
  };

  if (tag === 'form') {
    element.addEventListener = jest.fn((event, handler) => {
      if (event === 'submit') {
        element.submitHandler = handler;
      }
    });
  }

  return element;
});

describe('FormGenerator', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateForm', () => {
    test('should create a form with fields based on schema', () => {
      // Example schema structure (not used directly in test)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _testSchema = z.object({
        name: z.string().min(2),
        email: z.string().email(),
        age: z.number().min(18),
      });

      // Mock container element
      const container = document.createElement('div');
      const onSubmit = jest.fn();

      // Generate the form using a mock schema for the actual test
      const mockSchema = {
        _def: {
          shape: () => ({
            name: { _def: {} },
            email: { _def: {} },
            age: { _def: {} },
          }),
        },
      };

      generateForm(container, mockSchema, onSubmit);

      // Check if form was created and added to container
      expect(document.createElement).toHaveBeenCalledWith('form');
      expect(container.appendChild).toHaveBeenCalled();

      // With a mock DOM environment, we can't easily check the exact fields
      // that were created, but we can verify that the code executed without errors
      // and some basic assumptions

      // For each field in the schema...
      expect(document.createElement).toHaveBeenCalledWith('label');
      expect(document.createElement).toHaveBeenCalledWith('input');
    });

    test('should handle form submission with validation', () => {
      // Example schema structure (not used directly in test)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _schema = z.object({
        name: z.string().min(2),
      });

      const mockSchema = {
        _def: {
          shape: () => ({
            name: { _def: {} },
          }),
        },
        safeParse: jest.fn().mockReturnValue({
          success: true,
          data: { name: 'Test User' },
        }),
      };

      // Mock container element
      const container = document.createElement('div');
      const onSubmit = jest.fn();
      // Setup form with event handlers
      const mockForm = document.createElement('form') as any;
      
      // Add querySelectorAll method to the form
      mockForm.querySelectorAll = jest.fn().mockReturnValue([]);
      
      // Mock FormData constructor
      global.FormData = jest.fn().mockImplementation(() => ({
        get: jest.fn().mockReturnValue('Test User'),
      })) as any;

      // Mock createElement to return our mockForm for forms
      (document.createElement as jest.Mock).mockImplementation(tag => {
        if (tag === 'form') return mockForm;
        return {
          appendChild: jest.fn(),
          addEventListener: jest.fn(),
          classList: { add: jest.fn() },
          style: {},
        };
      });

      // Generate the form
      generateForm(container, mockSchema, onSubmit);

      // Simulate form submission
      const event = { preventDefault: jest.fn() };
      mockForm.submitHandler(event);

      // Check that preventDefault was called
      expect(event.preventDefault).toHaveBeenCalled();

      // Check that schema.safeParse was called
      expect(mockSchema.safeParse).toHaveBeenCalled();

      // Check that onSubmit was called with the validated data
      expect(onSubmit).toHaveBeenCalledWith({ name: 'Test User' });
    });

    test('should display validation errors when form is invalid', () => {
      // Create a mock schema with validation error
      const mockSchema = {
        _def: {
          shape: () => ({
            name: { _def: {} },
          }),
        },
        safeParse: jest.fn().mockReturnValue({
          success: false,
          error: {
            errors: [{ path: ['name'], message: 'Name is required' }],
          },
        }),
      };

      // Mock DOM elements
      const container = document.createElement('div');
      const onSubmit = jest.fn();
      // Setup form with event handlers
      const mockForm = document.createElement('form') as any;
      
      // Add querySelectorAll method to the form
      mockForm.querySelectorAll = jest.fn().mockReturnValue([]);
      
      // Mock FormData constructor
      global.FormData = jest.fn().mockImplementation(() => ({
        get: jest.fn().mockReturnValue(''),
      })) as any;

      // Mock createElement to return our mockForm for forms
      (document.createElement as jest.Mock).mockImplementation(tag => {
        if (tag === 'form') return mockForm;
        return {
          appendChild: jest.fn(),
          addEventListener: jest.fn(),
          classList: { add: jest.fn() },
          style: {},
        };
      });

      const mockErrorContainer = document.createElement('div');

      // Mock getElementById for error container
      (document.getElementById as jest.Mock).mockReturnValue(
        mockErrorContainer
      );

      // Generate the form
      generateForm(container, mockSchema, onSubmit);

      // Simulate form submission
      const event = { preventDefault: jest.fn() };
      mockForm.submitHandler(event);

      // Check that preventDefault was called
      expect(event.preventDefault).toHaveBeenCalled();

      // Check that schema.safeParse was called
      expect(mockSchema.safeParse).toHaveBeenCalled();

      // Check that onSubmit was not called
      expect(onSubmit).not.toHaveBeenCalled();

      // Error should be displayed in the error container
      // With our mock setup, we can't directly check the text content
      // but we can verify that getElementById was called
      expect(document.getElementById).toHaveBeenCalledWith('name-error');
    });
  });

  describe('createModalForm', () => {
    test('should create a modal with a form', () => {
      // Create a test schema
      const formSchema = z.object({
        name: z.string(),
      });

      const onSubmit = jest.fn();

      // Mock document.body
      document.body = {
        appendChild: jest.fn(),
      } as any;

      // Create modal form
      const modal = createModalForm(formSchema, onSubmit);

      // Check if modal is created
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(document.body.appendChild).toHaveBeenCalled();

      // Check if show/hide methods work
      modal.show();
      modal.hide();
      
      // We can't directly check style changes with our mocks,
      // but we can at least verify the methods don't throw errors
    });
  });
});