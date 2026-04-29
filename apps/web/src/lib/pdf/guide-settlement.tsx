import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { existsSync } from 'fs';
import path from 'path';

export interface GuideSettlementPdfData {
  workspace: {
    name: string;
    businessNumber?: string | null;
    representative?: string | null;
    address?: string | null;
    phone?: string | null;
  };
  guide: {
    name: string;
    phone?: string | null;
    bankAccount?: string | null;
  };
  period: { start: string; end: string };
  rows: { date: string; teamLabel: string; amountMinor: number; memo?: string | null }[];
  summary: { totalMinor: number; vatMinor: number; netMinor: number };
  issuedAt: string;
  issuedBy: string;
}

function fontPath(fileName: string) {
  const candidates = [
    path.join(process.cwd(), 'public', 'fonts', fileName),
    path.join(process.cwd(), 'apps', 'web', 'public', 'fonts', fileName),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]!;
}

Font.register({
  family: 'NotoSansKR',
  fonts: [
    { src: fontPath('NotoSansKR-Regular.ttf'), fontWeight: 400 },
    { src: fontPath('NotoSansKR-Bold.ttf'), fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: 'NotoSansKR',
    fontSize: 10,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  headerBox: {
    border: '1 solid #d6dee8',
    borderRadius: 6,
    padding: 12,
    marginBottom: 22,
    backgroundColor: '#f8fafc',
  },
  workspaceName: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6,
  },
  headerLine: {
    lineHeight: 1.5,
    color: '#475569',
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 22,
  },
  targetBox: {
    border: '1 solid #e2e8f0',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    color: '#64748b',
  },
  value: {
    fontWeight: 700,
  },
  table: {
    border: '1 solid #cbd5e1',
    marginTop: 4,
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 28,
  },
  tableHeader: {
    backgroundColor: '#10213f',
    color: '#ffffff',
    fontWeight: 700,
  },
  cell: {
    borderRight: '1 solid #cbd5e1',
    borderBottom: '1 solid #cbd5e1',
    padding: 6,
  },
  dateCell: { width: '15%' },
  teamCell: { width: '40%' },
  amountCell: { width: '25%', textAlign: 'right' },
  memoCell: { width: '20%', borderRight: 0 },
  summaryBox: {
    marginTop: 18,
    marginLeft: 'auto',
    width: 230,
    borderTop: '1 solid #0f172a',
    paddingTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  netRow: {
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
  },
  footer: {
    marginTop: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerText: {
    color: '#475569',
    lineHeight: 1.6,
  },
  stampBox: {
    width: 60,
    height: 60,
    border: '1 solid #94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
    fontSize: 9,
  },
});

function money(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`;
}

function businessLine(label: string, value?: string | null) {
  return value ? `${label}: ${value}` : null;
}

export function GuideSettlementPdf({ data }: { data: GuideSettlementPdfData }) {
  const businessLines = [
    businessLine('사업자번호', data.workspace.businessNumber),
    businessLine('대표', data.workspace.representative),
    businessLine('주소', data.workspace.address),
    businessLine('전화', data.workspace.phone),
  ].filter(Boolean);

  return (
    <Document title={`가이드 정산서_${data.guide.name}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBox}>
          <Text style={styles.workspaceName}>{data.workspace.name}</Text>
          {businessLines.map((line) => (
            <Text key={line} style={styles.headerLine}>
              {line}
            </Text>
          ))}
        </View>

        <Text style={styles.title}>가이드 정산서</Text>

        <View style={styles.targetBox}>
          <View style={styles.targetRow}>
            <Text style={styles.label}>정산 대상</Text>
            <Text style={styles.value}>{data.guide.name}</Text>
          </View>
          <View style={styles.targetRow}>
            <Text style={styles.label}>연락처</Text>
            <Text style={styles.value}>{data.guide.phone ?? '-'}</Text>
          </View>
          <View style={styles.targetRow}>
            <Text style={styles.label}>계좌</Text>
            <Text style={styles.value}>{data.guide.bankAccount ?? '-'}</Text>
          </View>
          <View style={styles.targetRow}>
            <Text style={styles.label}>기간</Text>
            <Text style={styles.value}>
              {data.period.start} ~ {data.period.end}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.cell, styles.dateCell]}>날짜</Text>
            <Text style={[styles.cell, styles.teamCell]}>팀</Text>
            <Text style={[styles.cell, styles.amountCell]}>금액</Text>
            <Text style={[styles.cell, styles.memoCell]}>메모</Text>
          </View>
          {data.rows.map((row, index) => (
            <View key={`${row.date}-${row.teamLabel}-${index}`} style={styles.tableRow}>
              <Text style={[styles.cell, styles.dateCell]}>{row.date}</Text>
              <Text style={[styles.cell, styles.teamCell]}>{row.teamLabel}</Text>
              <Text style={[styles.cell, styles.amountCell]}>{money(row.amountMinor)}</Text>
              <Text style={[styles.cell, styles.memoCell]}>{row.memo ?? '-'}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text>합계</Text>
            <Text>{money(data.summary.totalMinor)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>VAT 10%</Text>
            <Text>{money(data.summary.vatMinor)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.netRow]}>
            <Text>실수령액</Text>
            <Text>{money(data.summary.netMinor)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.footerText}>발행일: {data.issuedAt}</Text>
            <Text style={styles.footerText}>작성자: {data.issuedBy}</Text>
          </View>
          <View style={styles.stampBox}>
            <Text>도장</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
