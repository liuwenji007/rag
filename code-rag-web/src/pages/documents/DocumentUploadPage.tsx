import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { uploadDocument } from '../../services/documents';
import type { UploadDocumentRequest } from '../../services/documents';

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  result?: {
    id: string;
    title: string;
    documentType: string | null;
    uploadedAt: string;
  };
}

export default function DocumentUploadPage() {
  const [searchParams] = useSearchParams();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [documentType, setDocumentType] = useState<'prd' | 'design' | 'knowledge' | ''>('');
  const [isDragging, setIsDragging] = useState(false);

  // 从 URL 参数中获取文档类型
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'prd' || type === 'design' || type === 'knowledge') {
      setDocumentType(type);
    }
  }, [searchParams]);

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadFile[] = Array.from(selectedFiles).map((file) => ({
      file,
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      status: 'pending' as const,
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = e.dataTransfer.files;
      handleFileSelect(droppedFiles);
    },
    [handleFileSelect],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files);
      // 重置 input，允许重复选择同一文件
      e.target.value = '';
    },
    [handleFileSelect],
  );

  const handleUpload = useCallback(
    async (uploadFile: UploadFile) => {
      // 更新状态为上传中
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'uploading', progress: 0 }
            : f,
        ),
      );

      try {
        const request: UploadDocumentRequest = {
          file: uploadFile.file,
          documentType: documentType || undefined,
        };

        const result = await uploadDocument(request, (progress) => {
          // 更新上传进度
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, progress } : f,
            ),
          );
        });

        // 更新状态为成功
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: 'success',
                  progress: 100,
                  result: {
                    id: result.id,
                    title: result.title,
                    documentType: result.documentType || '',
                    uploadedAt: result.uploadedAt,
                  },
                }
              : f,
          ),
        );
      } catch (error) {
        // 更新状态为失败
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: 'error',
                  error:
                    error instanceof Error
                      ? error.message
                      : '上传失败，请重试',
                }
              : f,
          ),
        );
      }
    },
    [documentType],
  );

  const handleUploadAll = useCallback(() => {
    files
      .filter((f) => f.status === 'pending')
      .forEach((f) => handleUpload(f));
  }, [files, handleUpload]);

  const handleRemove = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleRetry = useCallback(
    (uploadFile: UploadFile) => {
      handleUpload(uploadFile);
    },
    [handleUpload],
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const pendingFiles = files.filter((f) => f.status === 'pending');
  const uploadingFiles = files.filter((f) => f.status === 'uploading');
  const successFiles = files.filter((f) => f.status === 'success');
  const errorFiles = files.filter((f) => f.status === 'error');

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px' }}>文档上传</h1>

      {/* 文档类型选择 */}
      <div style={{ marginBottom: '24px' }}>
        <label
          htmlFor="documentType"
          style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}
        >
          文档类型（可选）
        </label>
        <select
          id="documentType"
          value={documentType}
          onChange={(e) =>
            setDocumentType(
              e.target.value as 'prd' | 'design' | 'knowledge' | '',
            )
          }
          style={{
            width: '200px',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          <option value="">默认</option>
          <option value="prd">PRD</option>
          <option value="design">设计稿</option>
          <option value="knowledge">知识文档</option>
        </select>
      </div>

      {/* 上传区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? '#007bff' : '#ddd'}`,
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: isDragging ? '#f0f8ff' : '#fafafa',
          marginBottom: '24px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <input
          id="fileInput"
          type="file"
          multiple
          accept=".md,.docx,.pdf,.png,.jpg,.jpeg,.svg"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
        <div>
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>
            {isDragging ? '松开鼠标上传文件' : '拖拽文件到此处或点击选择文件'}
          </p>
          <p style={{ fontSize: '14px', color: '#666' }}>
            支持 Markdown、Word、PDF、图片格式，单个文件不超过 50MB
          </p>
        </div>
      </div>

      {/* 批量上传按钮 */}
      {pendingFiles.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={handleUploadAll}
            style={{
              padding: '10px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            上传全部 ({pendingFiles.length})
          </button>
        </div>
      )}

      {/* 文件列表 */}
      {files.length > 0 && (
        <div>
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>文件列表</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {files.map((uploadFile) => (
              <div
                key={uploadFile.id}
                style={{
                  padding: '16px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 'bold',
                        marginBottom: '4px',
                        fontSize: '14px',
                      }}
                    >
                      {uploadFile.file.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {formatFileSize(uploadFile.file.size)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {uploadFile.status === 'pending' && (
                      <button
                        onClick={() => handleUpload(uploadFile)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        上传
                      </button>
                    )}
                    {uploadFile.status === 'error' && (
                      <button
                        onClick={() => handleRetry(uploadFile)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        重试
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(uploadFile.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>

                {/* 上传进度 */}
                {uploadFile.status === 'uploading' && (
                  <div style={{ marginTop: '8px' }}>
                    <div
                      style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#e0e0e0',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${uploadFile.progress}%`,
                          height: '100%',
                          backgroundColor: '#007bff',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#666',
                        marginTop: '4px',
                      }}
                    >
                      {uploadFile.progress}%
                    </div>
                  </div>
                )}

                {/* 错误信息 */}
                {uploadFile.status === 'error' && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px',
                      backgroundColor: '#fee',
                      borderRadius: '4px',
                      color: '#c33',
                      fontSize: '12px',
                    }}
                  >
                    {uploadFile.error}
                  </div>
                )}

                {/* 成功信息 */}
                {uploadFile.status === 'success' && uploadFile.result && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px',
                      backgroundColor: '#efe',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ color: '#28a745', fontWeight: 'bold' }}>
                      ✓ 上传成功
                    </div>
                    <div style={{ color: '#666', marginTop: '4px' }}>
                      文档 ID: {uploadFile.result.id}
                    </div>
                    <div style={{ color: '#666' }}>
                      上传时间: {new Date(uploadFile.result.uploadedAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 统计信息 */}
          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          >
            <div style={{ display: 'flex', gap: '24px' }}>
              <div>
                总计: <strong>{files.length}</strong>
              </div>
              <div>
                待上传: <strong>{pendingFiles.length}</strong>
              </div>
              <div>
                上传中: <strong>{uploadingFiles.length}</strong>
              </div>
              <div style={{ color: '#28a745' }}>
                成功: <strong>{successFiles.length}</strong>
              </div>
              <div style={{ color: '#dc3545' }}>
                失败: <strong>{errorFiles.length}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

