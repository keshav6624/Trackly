import mongoose, { InferSchemaType, Model } from "mongoose";

const recentSubmissionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    statusDisplay: { type: String, required: true },
    timestamp: { type: Date },
    lang: { type: String },
  },
  { _id: false },
);

const studentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    leetcodeUsername: { type: String, required: true, trim: true },
    githubUsername: { type: String, required: true, trim: true },

    leetcode: {
      totalSolved: { type: Number, default: 0 },
      easy: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      hard: { type: Number, default: 0 },
      consistencyScore: { type: Number, default: 0 },
      recentSubmissions: { type: [recentSubmissionSchema], default: [] },
      lastActivityAt: { type: Date, default: null },
      lastUpdated: { type: Date, default: null },
    },

    github: {
      commitsLast7Days: { type: Number, default: 0 },
      repos: { type: Number, default: 0 },
      activityLevel: {
        type: String,
        enum: ["High", "Medium", "Low"],
        default: "Low",
      },
      lastActive: { type: Date, default: null },
      lastUpdated: { type: Date, default: null },
    },

    score: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Ready", "At Risk", "Inactive"],
      default: "Inactive",
    },
    lastFetchedAt: { type: Date, default: null, index: true },
    stale: { type: Boolean, default: false },
    warnings: { type: [String], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type StudentDocument = InferSchemaType<typeof studentSchema>;

export const StudentModel: Model<StudentDocument> =
  mongoose.models.Student || mongoose.model<StudentDocument>("Student", studentSchema);
