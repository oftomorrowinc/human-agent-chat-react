import React, { useState, useRef } from 'react';
import { Upload, Link, FileText, Image, Video, Music, X } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorageInstance } from '../lib/firebase';
import { MessageAttachment, AttachmentType } from '../types';
import Modal from './Modal';

interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (attachments: MessageAttachment[]) => void;
  enableForms?: boolean;
}

type TabType = 'url' | 'upload' | 'form';

const MediaUploadModal: React.FC<MediaUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  enableForms = true,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('url');
  const [urlValue, setUrlValue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const storage = getFirebaseStorageInstance();

  // Detect media type from URL
  const detectMediaType = (url: string): AttachmentType => {
    // YouTube detection
    if (/(?:youtube\.com\/|youtu\.be\/)/.test(url)) {
      return 'youtube';
    }

    // Image detection
    if (
      /\.(jpe?g|png|gif|webp|svg)$/i.test(url) ||
      /images\.unsplash\.com/.test(url)
    ) {
      return 'image';
    }

    // Video detection
    if (/\.(mp4|webm|ogg|mov|avi)$/i.test(url)) {
      return 'video';
    }

    // Audio detection
    if (/\.(mp3|wav|ogg|aac|m4a)$/i.test(url)) {
      return 'audio';
    }

    // Document detection
    if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/i.test(url)) {
      return 'document';
    }

    return 'link';
  };

  // Get file type from file
  const getFileType = (file: File): AttachmentType => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'file';
  };

  // Handle URL submission
  const handleUrlSubmit = () => {
    if (!urlValue.trim()) return;

    const type = detectMediaType(urlValue);
    const attachment: MessageAttachment = {
      type,
      url: urlValue,
      title: type === 'youtube' ? 'YouTube Video' : 'Media',
    };

    // Add thumbnail for YouTube
    if (type === 'youtube') {
      const videoIdMatch = urlValue.match(
        /(?:youtube\.com\/(?:.*[?&]v=|.*\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
      );
      if (videoIdMatch) {
        attachment.thumbnailUrl = `https://img.youtube.com/vi/${videoIdMatch[1]}/hqdefault.jpg`;
      }
    }

    onUpload([attachment]);
    setUrlValue('');
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
  };

  // Remove file from selection
  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  // Upload files to Firebase Storage
  const uploadFiles = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const attachments: MessageAttachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileId = `${Date.now()}_${i}_${file.name}`;
        const storageRef = ref(storage, `uploads/${fileId}`);

        // Update progress
        setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

        // Upload file
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Create attachment
        const attachment: MessageAttachment = {
          type: getFileType(file),
          url: downloadURL,
          title: file.name,
          mimeType: file.type,
          size: file.size,
        };

        attachments.push(attachment);

        // Update progress
        setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));
      }

      onUpload(attachments);
      setFiles([]);
      setUploadProgress({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image size={16} />;
    if (file.type.startsWith('video/')) return <Video size={16} />;
    if (file.type.startsWith('audio/')) return <Music size={16} />;
    return <FileText size={16} />;
  };

  const tabs = [
    { id: 'url' as TabType, label: 'URL', icon: <Link size={16} /> },
    { id: 'upload' as TabType, label: 'Upload', icon: <Upload size={16} /> },
    ...(enableForms
      ? [{ id: 'form' as TabType, label: 'Form', icon: <FileText size={16} /> }]
      : []),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Media"
      size="lg"
      closeOnBackdrop={!isUploading}
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex space-x-1 bg-dark-800 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-dark-300 hover:text-dark-100 hover:bg-dark-700'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* URL Tab */}
        {activeTab === 'url' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Media URL
              </label>
              <input
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="Paste YouTube, image, or other media URL..."
                className="form-input w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleUrlSubmit();
                  }
                }}
              />
              <p className="text-sm text-dark-400 mt-1">
                Supports YouTube, images, videos, audio, documents, and links
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUrlSubmit}
                disabled={!urlValue.trim() || isUploading}
                className="btn-primary"
              >
                Add Media
              </button>
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            {/* File Selection */}
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Select Files
              </label>
              <div
                className="border-2 border-dashed border-dark-600 rounded-lg p-6 text-center hover:border-dark-500 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto mb-2 text-dark-400" size={32} />
                <p className="text-dark-300 mb-1">Click to select files</p>
                <p className="text-sm text-dark-400">
                  Supports images, videos, audio, and documents
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Selected Files */}
            {files.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-dark-200">
                  Selected Files
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-dark-800 rounded-lg p-3"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-dark-400">{getFileIcon(file)}</div>
                        <div>
                          <p className="text-sm text-dark-200 font-medium">
                            {file.name}
                          </p>
                          <p className="text-xs text-dark-400">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-dark-400 hover:text-red-400 transition-colors"
                        disabled={isUploading}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-dark-200">
                  Uploading...
                </h4>
                {Object.entries(uploadProgress).map(([fileId, progress]) => (
                  <div key={fileId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-300">Uploading file...</span>
                      <span className="text-dark-400">{progress}%</span>
                    </div>
                    <div className="w-full bg-dark-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={uploadFiles}
                disabled={files.length === 0 || isUploading}
                className="btn-primary"
              >
                {isUploading ? 'Uploading...' : 'Upload Files'}
              </button>
            </div>
          </div>
        )}

        {/* Form Tab */}
        {activeTab === 'form' && enableForms && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <FileText className="mx-auto mb-4 text-dark-400" size={48} />
              <h3 className="text-lg font-medium text-dark-200 mb-2">
                Create Form Request
              </h3>
              <p className="text-dark-400 mb-4">
                This feature allows you to request structured data from other
                users using Zod schemas.
              </p>
              <p className="text-sm text-dark-500">
                Form creation functionality coming soon...
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                disabled
                className="btn-primary opacity-50 cursor-not-allowed"
              >
                Create Form (Coming Soon)
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MediaUploadModal;
