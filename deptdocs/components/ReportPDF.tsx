import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Exact styles mapping to the official University A4 layout
const styles = StyleSheet.create({
    page: {
        padding: '25.4mm', // Standard 1-inch margins
        fontFamily: 'Times-Roman',
        fontSize: 12,
        lineHeight: 1.2,
        paddingBottom: '30mm' // Extra padding at bottom for page numbers
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 15,
        borderBottom: '1.5px solid black',
        paddingBottom: 10
    },
    uniName: { fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase' },
    schoolName: { fontSize: 14, fontWeight: 'bold' },
    deptName: { fontSize: 13, fontWeight: 'bold' },
    reportTitle: { fontSize: 18, fontWeight: 'bold', textDecoration: 'underline', marginTop: 15, textTransform: 'uppercase' },

    section: { marginTop: 20 },
    sectionTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 8 },

    table: { width: '100%', border: '1px solid black' },
    row: { flexDirection: 'row', borderBottom: '1px solid black' },
    lastRow: { flexDirection: 'row' },
    labelCell: { width: '35%', padding: 6, borderRight: '1px solid black', fontWeight: 'bold', textTransform: 'uppercase', fontStyle: 'italic', fontSize: 11 },
    valueCell: { width: '65%', padding: 6, fontSize: 12 },

    // Custom cells for Participants & Excel Tables
    halfLabelCell: { padding: 6, borderRight: '1px solid black', fontWeight: 'bold', fontSize: 11 },
    halfValueCell: { padding: 6, fontSize: 11, borderRight: '1px solid black' },
    lastHalfValueCell: { padding: 6, fontSize: 11 },

    // Image styling
    signatureImage: { height: 40, objectFit: 'contain', marginTop: 2 },
    speakerPhoto: { width: 150, height: 150, objectFit: 'cover', marginVertical: 10, alignSelf: 'center', border: '1px solid #ccc' },
    activityPhoto: { width: '100%', maxHeight: 400, objectFit: 'contain', marginBottom: 5, border: '1px solid #ccc' },
    attachmentPhoto: { width: '100%', marginBottom: 15, border: '1px solid #ccc' },

    // Text blocks
    caption: { fontSize: 11, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    centeredTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
    bodyText: { fontSize: 12, textAlign: 'justify', marginBottom: 10, lineHeight: 1.4 },

    // Footer formatting
    footer: { position: 'absolute', bottom: '15mm', fontSize: 10, textAlign: 'center', left: 0, right: 0 }
});

// Helper for Excel Tables (renders parsed JSON data dynamically)
const ExcelTable = ({ jsonData }: { jsonData: any[] }) => {
    if (!jsonData || jsonData.length === 0) return null;

    // Grab headers (limit to first 5 columns to prevent PDF overflow)
    const headers = Object.keys(jsonData[0]).slice(0, 5);
    const colWidth = `${100 / headers.length}%`;

    return (
        <View style={[styles.table, { marginTop: 10 }]}>
            <View style={[styles.row, { backgroundColor: '#f3f4f6' }]}>
                {headers.map((header, i) => (
                    <Text key={i} style={[styles.halfLabelCell, { width: colWidth }, i === headers.length - 1 ? { borderRight: 'none' } : {}]}>
                        {header}
                    </Text>
                ))}
            </View>
            {jsonData.map((row, i) => (
                <View key={i} style={i === jsonData.length - 1 ? styles.lastRow : styles.row} wrap={false}>
                    {headers.map((header, j) => (
                        <Text key={j} style={[j === headers.length - 1 ? styles.lastHalfValueCell : styles.halfValueCell, { width: colWidth }]}>
                            {row[header] || "—"}
                        </Text>
                    ))}
                </View>
            ))}
        </View>
    );
};

const TableRow = ({ label, value, isLast = false }: { label: string, value: any, isLast?: boolean }) => {
    if (!value || value.toString().trim() === "") return null;
    return (
        <View style={isLast ? styles.lastRow : styles.row} wrap={false}>
            <Text style={styles.labelCell}>{label}</Text>
            <Text style={styles.valueCell}>{value}</Text>
        </View>
    );
};

// Helper function to format dates nicely (e.g., "12th March 2026")
const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;

        const day = date.getDate();
        const suffix = ["th", "st", "nd", "rd"][(day % 10 > 3 ? 0 : (day % 100 - day % 10 != 10) ? day % 10 : 0)];
        const month = date.toLocaleString('default', { month: 'long' });
        const year = date.getFullYear();

        return `${day}${suffix} ${month} ${year}`;
    } catch {
        return dateStr;
    }
};

export const ReportPDF = ({ data }: { data: any }) => {
    const hasData = (val: any) => val && val.toString().trim() !== "" && val !== "—";
    const hasArrayData = (arr: any[]) => arr && Array.isArray(arr) && arr.length > 0;

    // --- 🐛 THE DATE & TIME FIX ---
    // Handle Dates
    const rawStartDate = data.startDate || data.date;
    const rawEndDate = data.endDate;

    let dateDisplay = "—";
    if (rawStartDate) {
        const formattedStart = formatDate(rawStartDate);
        if (rawEndDate && rawStartDate !== rawEndDate) {
            const formattedEnd = formatDate(rawEndDate);
            dateDisplay = `${formattedStart} to ${formattedEnd}`;
        } else {
            dateDisplay = formattedStart;
        }
    }

    // Handle Times
    const startTime = data.startTime || data.time;
    const endTime = data.endTime;

    let timeDisplay = "—";
    if (startTime) {
        if (endTime && startTime !== endTime) {
            timeDisplay = `${startTime} to ${endTime}`;
        } else {
            timeDisplay = startTime;
        }
    }
    // ------------------------------

    const renderAttachmentSection = (files: any[], title: string, textData?: string) => {
        if (!hasArrayData(files) && !hasData(textData)) return null;
        return (
            <View break>
                <Text style={styles.centeredTitle}>{title}</Text>
                {hasData(textData) && <Text style={styles.bodyText}>{textData}</Text>}
                {hasArrayData(files) && files.map((file: any, fIdx: number) => (
                    <View key={fIdx}>
                        {file.pages?.map((img: string, pIdx: number) => (
                            <Image key={`${fIdx}-${pIdx}`} src={img} style={styles.attachmentPhoto} />
                        ))}
                        {file.jsonData && <ExcelTable jsonData={file.jsonData} />}
                    </View>
                ))}
            </View>
        );
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.headerContainer} wrap={false}>
                    <Text style={styles.uniName}>CHRIST (Deemed to be University)</Text>
                    <Text style={styles.schoolName}>School of Engineering and Technology</Text>
                    <Text style={styles.deptName}>Department of AI & Data Science</Text>
                    <Text style={styles.reportTitle}>ACTIVITY REPORT</Text>
                </View>

                {/* 1. GENERAL INFORMATION */}
                <View style={styles.section} wrap={false}>
                    <Text style={styles.sectionTitle}>General Information</Text>
                    <View style={styles.table}>
                        <TableRow label="Title of the Activity" value={data.activityTitle} />
                        <TableRow label="Activity Type" value={data.activityType} />
                        <TableRow label="Sub Category" value={data.subCategory} />
                        <TableRow label="Venue" value={data.venue} />
                        <TableRow label="Collaboration/Sponsor" value={data.collaboration} />

                        {/* 👈 USING THE NEW FIXED VARIABLES HERE */}
                        <TableRow label="Date/s" value={dateDisplay} />
                        <TableRow label="Time" value={timeDisplay} isLast={true} />
                    </View>
                </View>

                {/* 2. SPEAKER/GUEST DETAILS */}
                {hasArrayData(data.speakers) && data.speakers.some((s: any) => hasData(s.name)) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Speaker/Guest/Presenter Details</Text>
                        {data.speakers.map((speaker: any, idx: number) => (
                            <View key={idx} style={[styles.table, { marginBottom: 10 }]} wrap={false}>
                                <TableRow label="Name" value={speaker.name} />
                                <TableRow label="Title/Position" value={speaker.designation} />
                                <TableRow label="Organization" value={speaker.organization} />
                                <TableRow label="Contact Info" value={speaker.contact} />
                                <TableRow label="Title of Presentation" value={speaker.presentationTitle} isLast={true} />
                            </View>
                        ))}
                    </View>
                )}

                {/* 3. PARTICIPANTS PROFILE */}
                {hasArrayData(data.participantProfiles || data.participantsProfile) && (
                    <View style={styles.section} wrap={false}>
                        <Text style={styles.sectionTitle}>Participants profile</Text>
                        <View style={styles.table}>
                            <View style={[styles.row, { backgroundColor: '#f9fafb' }]}>
                                <Text style={[styles.halfLabelCell, { width: '50%' }]}>Type of Participants</Text>
                                <Text style={[styles.halfLabelCell, { width: '50%', borderRight: 'none' }]}>No. of Participants</Text>
                            </View>
                            {(data.participantProfiles || data.participantsProfile).map((pt: any, idx: number) => (
                                <View key={idx} style={idx === (data.participantProfiles || data.participantsProfile).length - 1 ? styles.lastRow : styles.row} wrap={false}>
                                    <Text style={[styles.halfValueCell, { width: '50%', fontWeight: 'normal' }]}>{pt.type}</Text>
                                    <Text style={[styles.lastHalfValueCell, { width: '50%' }]}>{pt.count}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* 4. SYNOPSIS */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Synopsis of the Activity</Text>
                    <View style={styles.table}>
                        <TableRow label="Highlights" value={data.highlights} />
                        <TableRow label="Key Takeaways" value={data.takeaways} />
                        <TableRow label="Summary" value={data.summary} />
                        <TableRow label="Follow-up plan" value={data.followUpPlan || data.followUp} isLast={true} />
                    </View>
                </View>

                {/* 5. REPORT PREPARED BY */}
                {hasArrayData(data.organizersList) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Report prepared by</Text>
                        {data.organizersList.map((org: any, idx: number) => (
                            <View key={idx} style={[styles.table, { marginBottom: 10 }]} wrap={false}>
                                <TableRow label="Name" value={org.name} />
                                <TableRow label="Designation" value={org.designation} />
                                <View style={styles.lastRow}>
                                    <Text style={styles.labelCell}>Digital Signature</Text>
                                    <View style={styles.valueCell}>
                                        {org.signatureImage ? <Image src={org.signatureImage} style={styles.signatureImage} /> : <Text style={{ color: 'gray', fontStyle: 'italic' }}>—</Text>}
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* 6. SPEAKER PROFILE (Forces new page) */}
                {hasArrayData(data.speakers) && data.speakers.some((s: any) => hasData(s.about) || hasData(s.photo)) && (
                    <View break>
                        <Text style={styles.centeredTitle}>Speaker Profile</Text>
                        {data.speakers.map((speaker: any, idx: number) => (
                            <View key={idx} style={{ marginBottom: 20 }} wrap={false}>
                                {hasData(speaker.photoUrl || speaker.photo) && (
                                    <Image src={speaker.photoUrl || speaker.photo} style={styles.speakerPhoto} />
                                )}
                                {hasData(speaker.about) && (
                                    <Text style={styles.bodyText}>{speaker.about}</Text>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* 7. PHOTOS OF THE ACTIVITY (Forces new page) */}
                {hasArrayData(data.activityPhotos) && (
                    <View break>
                        <Text style={styles.centeredTitle}>Photos of the activity</Text>

                        {/* 👈 UPDATED CAPTION TO USE FIXED DATE */}
                        <Text style={{ textAlign: 'center', marginBottom: 20, fontStyle: 'italic' }}>
                            ({data.activityType || "Activity"} - {dateDisplay})
                        </Text>

                        {data.activityPhotos.map((photo: any, idx: number) => (
                            <View key={idx} wrap={false} style={{ marginBottom: 15 }}>
                                <Image src={photo.url} style={styles.activityPhoto} />
                                {hasData(photo.caption) && (
                                    <Text style={styles.caption}>{photo.caption}</Text>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* 8-12. ATTACHMENT PAGES */}
                {renderAttachmentSection(data.attendanceFiles, "Attendance List")}
                {renderAttachmentSection(data.brochureFiles, "Event Brochure")}
                {renderAttachmentSection(data.approvalFiles, "Notice for Approval")}
                {renderAttachmentSection(data.feedbackFiles, "Feedback Analysis")}

                <Text style={styles.footer} render={({ pageNumber }) => (`Page ${pageNumber}`)} fixed />
            </Page>
        </Document>
    );
};
