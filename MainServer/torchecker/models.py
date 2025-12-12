"""
TOR (Transcript of Records) models with improved validation.
"""
from django.db import models
from django.core.exceptions import ValidationError
from core.validators import (
    validate_account_id,
    validate_grade,
    validate_units,
    validate_semester,
    validate_school_year
)


class TorTransferee(models.Model):
    """
    Transcript of Records for transferee students.
    
    Stores the original TOR data extracted from uploaded documents.
    """
    
    class Semester(models.TextChoices):
        FIRST = 'first', 'First Semester'
        SECOND = 'second', 'Second Semester'
        SUMMER = 'summer', 'Summer'
    
    account_id = models.CharField(
        max_length=100,
        default="",
        validators=[validate_account_id],
        db_index=True,
        help_text='Student account identifier'
    )
    student_name = models.CharField(
        max_length=100,
        help_text='Full name of the student'
    )
    school_name = models.CharField(
        max_length=255,
        help_text='Name of previous institution'
    )
    
    # Subject information
    subject_code = models.CharField(
        max_length=50,
        db_index=True,
        help_text='Subject/course code'
    )
    subject_description = models.CharField(
        max_length=500,  # Increased from 255 for long subject names
        help_text='Full subject description'
    )
    student_year = models.CharField(
        max_length=20,
        help_text='Year level when taken'
    )
    pre_requisite = models.CharField(
        max_length=500,  # Increased from 255 for multiple prerequisites
        blank=True,
        null=True,
        help_text='Pre-requisite subjects'
    )
    co_requisite = models.CharField(
        max_length=500,  # Increased from 255 for multiple corequisites
        blank=True,
        null=True,
        help_text='Co-requisite subjects'
    )
    
    # Academic details
    semester = models.CharField(
        max_length=10,
        choices=Semester.choices,
        help_text='Semester when taken'
    )
    school_year_offered = models.CharField(
        max_length=20,
        help_text='Academic year (e.g., 2023-2024)'
    )
    total_academic_units = models.FloatField(
        validators=[validate_units],
        help_text='Number of academic units/credits'
    )
    final_grade = models.FloatField(
        validators=[validate_grade],
        help_text='Final grade received'
    )
    remarks = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='Additional remarks (PASSED/FAILED)'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tor_transferee'
        verbose_name = 'TOR Transferee'
        verbose_name_plural = 'TOR Transferees'
        indexes = [
            models.Index(fields=['account_id', 'subject_code']),
            models.Index(fields=['student_name']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['account_id', 'subject_code']

    def __str__(self):
        return f"{self.student_name} - {self.subject_code}"

    def clean(self):
        """Validate model instance"""
        super().clean()
        
        # Validate semester
        if self.semester:
            validate_semester(self.semester)
        
        # Validate school year
        if self.school_year_offered:
            validate_school_year(self.school_year_offered)

    @property
    def is_passing_grade(self) -> bool:
        """Check if grade is passing (standard 1.0-2.9 scale)"""
        return 1.0 <= self.final_grade <= 2.9

    @property
    def display_grade(self) -> str:
        """Get formatted grade display"""
        return f"{self.final_grade} ({self.remarks or 'N/A'})"


class TorDocument(models.Model):
    """
    Uploaded TOR Document.
    Stores the original uploaded file for reference.
    """
    account_id = models.CharField(
        max_length=100,
        validators=[validate_account_id],
        db_index=True,
        help_text='Student account identifier'
    )
    file = models.ImageField(
        upload_to='tor_documents/%Y/%m/',
        help_text='Uploaded TOR image'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'tor_document'
        verbose_name = 'TOR Document'
        verbose_name_plural = 'TOR Documents'
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['account_id']),
            models.Index(fields=['uploaded_at']),
        ]
        
    def __str__(self):
        return f"TOR - {self.account_id} - {self.uploaded_at}"