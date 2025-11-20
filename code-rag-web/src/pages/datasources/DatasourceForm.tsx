import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getDataSource,
  createDataSource,
  updateDataSource,
  testConnection,
  type DataSourceType,
  type CreateDataSourceDto,
  type UpdateDataSourceDto,
  type FeishuDataSourceConfig,
  type GitLabDataSourceConfig,
  type DatabaseDataSourceConfig,
} from '../../services/datasources';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';

function DatasourceForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const [formData, setFormData] = useState<CreateDataSourceDto>({
    name: '',
    type: 'FEISHU',
    config: {
      appId: '',
      appSecret: '',
      spaceId: '',
    } as FeishuDataSourceConfig,
    enabled: true,
    description: '',
  });

  useEffect(() => {
    if (isEdit && id) {
      loadDataSource(id);
    }
  }, [id, isEdit]);

  const loadDataSource = async (dataSourceId: string) => {
    try {
      setLoading(true);
      const data = await getDataSource(dataSourceId);
      setFormData({
        name: data.name,
        type: data.type,
        config: data.config as FeishuDataSourceConfig | GitLabDataSourceConfig | DatabaseDataSourceConfig,
        enabled: data.enabled,
        description: data.description || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据源失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: DataSourceType) => {
    let defaultConfig: FeishuDataSourceConfig | GitLabDataSourceConfig | DatabaseDataSourceConfig;

    switch (type) {
      case 'FEISHU':
        defaultConfig = { appId: '', appSecret: '', spaceId: '' };
        break;
      case 'GITLAB':
        defaultConfig = { url: '', accessToken: '', projectIds: [] };
        break;
      case 'DATABASE':
        defaultConfig = { type: 'postgresql', connectionString: '' };
        break;
    }

    setFormData({
      ...formData,
      type,
      config: defaultConfig,
    });
  };

  const handleConfigChange = (field: string, value: unknown) => {
    setFormData({
      ...formData,
      config: {
        ...(formData.config as unknown as Record<string, unknown>),
        [field]: value,
      } as unknown as FeishuDataSourceConfig | GitLabDataSourceConfig | DatabaseDataSourceConfig,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      if (isEdit && id) {
        await updateDataSource(id, formData as UpdateDataSourceDto);
      } else {
        await createDataSource(formData);
      }
      navigate('/datasources');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setError(null);
      const result = await testConnection({
        type: formData.type,
        config: formData.config,
      });
      if (result.success) {
        alert('连接测试成功：' + result.message);
      } else {
        setError('连接测试失败：' + result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '测试连接失败');
    } finally {
      setTesting(false);
    }
  };

  const renderFeishuConfig = () => {
    const config = formData.config as FeishuDataSourceConfig;
    return (
      <>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            App ID <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            value={config.appId || ''}
            onChange={(e) => handleConfigChange('appId', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
            required
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            App Secret <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="password"
            value={config.appSecret || ''}
            onChange={(e) => handleConfigChange('appSecret', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
            required
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            文档空间 ID <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            value={config.spaceId || ''}
            onChange={(e) => handleConfigChange('spaceId', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
            required
          />
        </div>
      </>
    );
  };

  const renderGitLabConfig = () => {
    const config = formData.config as GitLabDataSourceConfig;
    return (
      <>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            GitLab URL <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="url"
            value={config.url || ''}
            onChange={(e) => handleConfigChange('url', e.target.value)}
            placeholder="https://gitlab.example.com"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
            required
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            Access Token <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="password"
            value={config.accessToken || ''}
            onChange={(e) => handleConfigChange('accessToken', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
            required
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            项目 ID 列表（逗号分隔）
          </label>
          <input
            type="text"
            value={(config.projectIds || []).join(', ')}
            onChange={(e) =>
              handleConfigChange(
                'projectIds',
                e.target.value.split(',').map((id) => id.trim()).filter(Boolean),
              )
            }
            placeholder="123, 456, 789"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </div>
      </>
    );
  };

  const renderDatabaseConfig = () => {
    const config = formData.config as DatabaseDataSourceConfig;
    return (
      <>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            数据库类型 <span style={{ color: 'red' }}>*</span>
          </label>
          <select
            value={config.type || 'postgresql'}
            onChange={(e) =>
              handleConfigChange('type', e.target.value as 'mysql' | 'postgresql' | 'mongodb')
            }
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
            required
          >
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="mongodb">MongoDB</option>
          </select>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            连接字符串 <span style={{ color: 'red' }}>*</span>
          </label>
          <textarea
            value={config.connectionString || ''}
            onChange={(e) => handleConfigChange('connectionString', e.target.value)}
            placeholder="postgresql://user:password@host:port/database"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              minHeight: '80px',
            }}
            required
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            表名列表（可选，逗号分隔）
          </label>
          <input
            type="text"
            value={(config.tableNames || []).join(', ')}
            onChange={(e) =>
              handleConfigChange(
                'tableNames',
                e.target.value.split(',').map((name) => name.trim()).filter(Boolean),
              )
            }
            placeholder="users, orders, products"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </div>
      </>
    );
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <h1>{isEdit ? '编辑数据源' : '添加数据源'}</h1>

      {error && <ErrorMessage message={error} />}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            名称 <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            类型 <span style={{ color: 'red' }}>*</span>
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleTypeChange(e.target.value as DataSourceType)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
            required
          >
            <option value="FEISHU">飞书</option>
            <option value="GITLAB">GitLab</option>
            <option value="DATABASE">数据库</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>描述</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              minHeight: '60px',
            }}
          />
        </div>

        <div
          style={{
            marginBottom: '16px',
            padding: '16px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
          }}
        >
          <h3 style={{ marginTop: 0 }}>配置信息</h3>
          {formData.type === 'FEISHU' && renderFeishuConfig()}
          {formData.type === 'GITLAB' && renderGitLabConfig()}
          {formData.type === 'DATABASE' && renderDatabaseConfig()}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.enabled ?? true}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              style={{ marginRight: '8px' }}
            />
            <span>启用数据源</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            style={{
              padding: '10px 20px',
              backgroundColor: '#9e9e9e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: testing ? 'not-allowed' : 'pointer',
              opacity: testing ? 0.6 : 1,
            }}
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {isEdit ? '更新' : '创建'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/datasources')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#9e9e9e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}

export default DatasourceForm;

