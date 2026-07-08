import type { PreviewCourse } from "./previewTypes";

export const previewCourses: PreviewCourse[] = [
  {
    "id": "shanghai-grade8-preview",
    "type": "preview",
    "title": "八年级英语预习",
    "book": "沪教版八年级上册",
    "edition": "沪教版",
    "grade": "八年级",
    "term": "上册",
    "description": "面向八年级新课预习，包含单词释义、核心考点、例句和用法提示。",
    "units": [
      {
        "id": "unit-1",
        "label": "Unit 1",
        "title": "Unit 1",
        "status": "available",
        "wordCount": 47
      },
      {
        "id": "unit-2",
        "label": "Unit 2",
        "title": "Unit 2 Digital life",
        "status": "available",
        "wordCount": 55
      },
      {
        "id": "unit-3",
        "label": "Unit 3",
        "title": "Unit 3 Curious minds",
        "status": "available",
        "wordCount": 29
      },
      {
        "id": "unit-4",
        "label": "Unit 4",
        "title": "Unit 4 Then and now",
        "status": "available",
        "wordCount": 50
      },
      {
        "id": "unit-5",
        "label": "Unit 5",
        "title": "Unit 5 Teamwork",
        "status": "available",
        "wordCount": 42
      },
      {
        "id": "unit-6",
        "label": "Unit 6",
        "title": "Unit 6 Life in the future",
        "status": "available",
        "wordCount": 40
      }
    ]
  }
];

export default previewCourses;
