import React, { useState } from 'react';
// TODO: Restore ZodFormReact import when package is properly built
// import { ZodFormReact } from 'zod-form-react';
import Modal from './Modal';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  schema: any; // Zod schema
  onSubmit: (data: any) => void;
  title?: string;
  description?: string;
}

const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  schema: _schema,
  onSubmit,
  title = 'Form',
  description,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    setError(null);

    try {
      onSubmit(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={title}
      size="lg"
      closeOnBackdrop={!isSubmitting}
    >
      <div className="space-y-6">
        {description && <p className="text-dark-300">{description}</p>}

        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        <div className="form-container">
          {/* TODO: Restore ZodFormReact when package is properly built */}
          {/* <ZodFormReact
            schema={schema}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitText={isSubmitting ? 'Submitting...' : 'Submit'}
            cancelText="Cancel"
            disabled={isSubmitting}
            className={{
              form: 'space-y-4',
              field: 'space-y-2',
              label: 'block text-sm font-medium text-dark-200',
              input: 'form-input w-full',
              textarea: 'form-input w-full',
              select: 'form-input w-full',
              checkbox: 'form-checkbox',
              error: 'text-red-400 text-sm',
              submitButton: 'btn-primary w-full',
              cancelButton: 'btn-secondary w-full',
              buttonContainer: 'flex space-x-3 pt-4',
            }}
            theme="dark"
          /> */}
          
          {/* Temporary simplified form - replace when zod-form-react is built */}
          <form 
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = Object.fromEntries(formData.entries());
              handleSubmit(data);
            }}
          >
            <div className="space-y-4">
              <p className="text-dark-300 text-sm">
                Using simplified form (zod-form-react package needs build configuration)
              </p>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-dark-200">
                  Sample Input
                </label>
                <input
                  type="text"
                  name="sampleField"
                  className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter some data..."
                  required
                />
              </div>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-dark-700 text-dark-200 rounded-lg hover:bg-dark-600 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default FormModal;
