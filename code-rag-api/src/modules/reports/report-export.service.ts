import { Injectable, Logger } from '@nestjs/common';
import { SearchStatisticsService } from './search-statistics.service';
import { UserActivityService } from './user-activity.service';
import { DatasourceUsageService } from './datasource-usage.service';
import { BusinessProcessService } from './business-process.service';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export enum ReportFormat {
  CSV = 'csv',
  PDF = 'pdf',
  EXCEL = 'excel',
}

export enum ReportType {
  SEARCH_STATISTICS = 'search-statistics',
  USER_ACTIVITY = 'user-activity',
  DATASOURCE_USAGE = 'datasource-usage',
  BUSINESS_PROCESS = 'business-process',
  ALL = 'all',
}

export interface ReportConfig {
  types: ReportType[];
  format: ReportFormat;
  startDate?: Date;
  endDate?: Date;
  includeCharts?: boolean;
  includeSummary?: boolean;
}

@Injectable()
export class ReportExportService {
  private readonly logger = new Logger(ReportExportService.name);

  constructor(
    private readonly searchStatisticsService: SearchStatisticsService,
    private readonly userActivityService: UserActivityService,
    private readonly datasourceUsageService: DatasourceUsageService,
    private readonly businessProcessService: BusinessProcessService,
  ) {}

  /**
   * 导出报表
   */
  async exportReport(config: ReportConfig): Promise<Buffer | string> {
    switch (config.format) {
      case ReportFormat.CSV:
        return this.exportAsCsv(config);
      case ReportFormat.PDF:
        return this.exportAsPdf(config);
      case ReportFormat.EXCEL:
        return this.exportAsExcel(config);
      default:
        throw new Error(`Unsupported format: ${config.format}`);
    }
  }

  /**
   * 导出为 CSV
   */
  private async exportAsCsv(config: ReportConfig): Promise<string> {
    const lines: string[] = [];
    const now = new Date();

    // 报表头部
    lines.push('系统使用情况报表');
    lines.push(`生成时间: ${now.toISOString()}`);
    lines.push(`时间范围: ${config.startDate?.toISOString() || '全部'} - ${config.endDate?.toISOString() || '全部'}`);
    lines.push('');

    // 根据配置的报表类型导出
    if (config.types.includes(ReportType.SEARCH_STATISTICS) || config.types.includes(ReportType.ALL)) {
      lines.push('='.repeat(50));
      lines.push('检索统计报表');
      lines.push('='.repeat(50));
      const csv = await this.searchStatisticsService.exportToCsv(
        config.startDate,
        config.endDate,
      );
      lines.push(csv);
      lines.push('');
    }

    if (config.types.includes(ReportType.USER_ACTIVITY) || config.types.includes(ReportType.ALL)) {
      lines.push('='.repeat(50));
      lines.push('用户活跃度报表');
      lines.push('='.repeat(50));
      const csv = await this.userActivityService.exportToCsv(
        config.startDate,
        config.endDate,
      );
      lines.push(csv);
      lines.push('');
    }

    if (config.types.includes(ReportType.DATASOURCE_USAGE) || config.types.includes(ReportType.ALL)) {
      lines.push('='.repeat(50));
      lines.push('数据源使用情况报表');
      lines.push('='.repeat(50));
      const csv = await this.datasourceUsageService.exportToCsv(
        config.startDate,
        config.endDate,
      );
      lines.push(csv);
      lines.push('');
    }

    if (config.types.includes(ReportType.BUSINESS_PROCESS) || config.types.includes(ReportType.ALL)) {
      lines.push('='.repeat(50));
      lines.push('业务流程完成时间统计报表');
      lines.push('='.repeat(50));
      const csv = await this.businessProcessService.exportToCsv(
        config.startDate,
        config.endDate,
      );
      lines.push(csv);
      lines.push('');
    }

    // 报表页脚
    lines.push('='.repeat(50));
    lines.push(`报表生成时间: ${now.toLocaleString('zh-CN')}`);
    lines.push('='.repeat(50));

    return lines.join('\n');
  }

  /**
   * 导出为 PDF
   */
  private async exportAsPdf(config: ReportConfig): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const now = new Date();

        // 报表头部
        doc.fontSize(20).text('系统使用情况报表', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`生成时间: ${now.toLocaleString('zh-CN')}`, { align: 'center' });
        doc.text(`时间范围: ${config.startDate?.toLocaleDateString('zh-CN') || '全部'} - ${config.endDate?.toLocaleDateString('zh-CN') || '全部'}`, { align: 'center' });
        doc.moveDown();

        // 摘要说明
        if (config.includeSummary !== false) {
          doc.fontSize(14).text('摘要说明', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10).text('本报表包含系统使用情况的详细统计，包括检索统计、用户活跃度、数据源使用情况和业务流程完成时间统计。', {
            align: 'left',
          });
          doc.moveDown();
        }

        // 根据配置的报表类型导出
        this.addReportSection(doc, config, ReportType.SEARCH_STATISTICS, '检索统计报表');
        this.addReportSection(doc, config, ReportType.USER_ACTIVITY, '用户活跃度报表');
        this.addReportSection(doc, config, ReportType.DATASOURCE_USAGE, '数据源使用情况报表');
        this.addReportSection(doc, config, ReportType.BUSINESS_PROCESS, '业务流程完成时间统计报表');

        // 报表页脚
        doc.moveDown(2);
        doc.fontSize(10).text('='.repeat(50), { align: 'center' });
        doc.text(`报表生成时间: ${now.toLocaleString('zh-CN')}`, { align: 'center' });
        doc.text('='.repeat(50), { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 添加报表章节
   */
  private async addReportSection(
    doc: any, // PDFDocument type from pdfkit
    config: ReportConfig,
    type: ReportType,
    title: string,
  ) {
    if (!config.types.includes(type) && !config.types.includes(ReportType.ALL)) {
      return;
    }

    // 检查是否需要分页
    if (doc.y > 700) {
      doc.addPage();
    }

    doc.fontSize(16).text(title, { underline: true });
    doc.moveDown(0.5);

    // 获取数据并添加到 PDF
    let data: string;
    try {
      switch (type) {
        case ReportType.SEARCH_STATISTICS:
          data = await this.searchStatisticsService.exportToCsv(
            config.startDate,
            config.endDate,
          );
          break;
        case ReportType.USER_ACTIVITY:
          data = await this.userActivityService.exportToCsv(
            config.startDate,
            config.endDate,
          );
          break;
        case ReportType.DATASOURCE_USAGE:
          data = await this.datasourceUsageService.exportToCsv(
            config.startDate,
            config.endDate,
          );
          break;
        case ReportType.BUSINESS_PROCESS:
          data = await this.businessProcessService.exportToCsv(
            config.startDate,
            config.endDate,
          );
          break;
        default:
          return;
      }

      // 将 CSV 数据转换为表格格式添加到 PDF
      const lines = data.split('\n');
      doc.fontSize(10);
      lines.forEach((line) => {
        if (line.trim() && !line.startsWith('=')) {
          if (doc.y > 750) {
            doc.addPage();
          }
          doc.text(line, { align: 'left' });
        }
      });
    } catch (error) {
      this.logger.error(`Failed to add report section ${title}: ${error}`);
      doc.text(`生成 ${title} 时出错: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    doc.moveDown();
  }

  /**
   * 导出为 Excel
   */
  private async exportAsExcel(config: ReportConfig): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const now = new Date();

    // 创建摘要工作表
    if (config.includeSummary !== false) {
      const summarySheet = workbook.addWorksheet('摘要');
      summarySheet.getCell('A1').value = '系统使用情况报表';
      summarySheet.getCell('A1').font = { size: 16, bold: true };
      summarySheet.getCell('A2').value = `生成时间: ${now.toLocaleString('zh-CN')}`;
      summarySheet.getCell('A3').value = `时间范围: ${config.startDate?.toLocaleDateString('zh-CN') || '全部'} - ${config.endDate?.toLocaleDateString('zh-CN') || '全部'}`;
      summarySheet.getCell('A5').value = '摘要说明';
      summarySheet.getCell('A5').font = { bold: true };
      summarySheet.getCell('A6').value = '本报表包含系统使用情况的详细统计，包括检索统计、用户活跃度、数据源使用情况和业务流程完成时间统计。';
      summarySheet.columns = [{ width: 80 }];
    }

    // 根据配置的报表类型导出
    if (config.types.includes(ReportType.SEARCH_STATISTICS) || config.types.includes(ReportType.ALL)) {
      await this.addExcelSheet(
        workbook,
        '检索统计',
        () => this.searchStatisticsService.exportToCsv(config.startDate, config.endDate),
      );
    }

    if (config.types.includes(ReportType.USER_ACTIVITY) || config.types.includes(ReportType.ALL)) {
      await this.addExcelSheet(
        workbook,
        '用户活跃度',
        () => this.userActivityService.exportToCsv(config.startDate, config.endDate),
      );
    }

    if (config.types.includes(ReportType.DATASOURCE_USAGE) || config.types.includes(ReportType.ALL)) {
      await this.addExcelSheet(
        workbook,
        '数据源使用情况',
        () => this.datasourceUsageService.exportToCsv(config.startDate, config.endDate),
      );
    }

    if (config.types.includes(ReportType.BUSINESS_PROCESS) || config.types.includes(ReportType.ALL)) {
      await this.addExcelSheet(
        workbook,
        '业务流程统计',
        () => this.businessProcessService.exportToCsv(config.startDate, config.endDate),
      );
    }

    // 生成 Excel 文件
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * 添加 Excel 工作表
   */
  private async addExcelSheet(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    getData: () => Promise<string>,
  ) {
    try {
      const sheet = workbook.addWorksheet(sheetName);
      const csvData = await getData();
      const lines = csvData.split('\n');

      let row = 1;
      lines.forEach((line) => {
        if (line.trim()) {
          const cells = line.split(',');
          cells.forEach((cell, col) => {
            const cellRef = sheet.getCell(row, col + 1);
            cellRef.value = cell.replace(/^"|"$/g, ''); // 移除 CSV 中的引号
            if (line.includes('报表') || line.includes('统计') || line.includes('时间范围')) {
              cellRef.font = { bold: true };
            }
          });
          row++;
        }
      });

      // 自动调整列宽
      sheet.columns.forEach((column) => {
        if (column) {
          column.width = 20;
        }
      });
    } catch (error) {
      this.logger.error(`Failed to add Excel sheet ${sheetName}: ${error}`);
    }
  }
}

