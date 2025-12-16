import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, DocumentType, DocumentStatus } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Documents')
@ApiBearerAuth('JWT-auth')
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a document', description: 'Uploads a trade document (certificate, license, invoice, etc.). File should be base64 encoded in fileUrl field.' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(@Body() createDocumentDto: CreateDocumentDto, @Request() req) {
    return this.documentsService.create(createDocumentDto, req.user?.sub || req.user?.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents', description: 'Returns a paginated list of documents with optional filters' })
  @ApiQuery({ name: 'type', required: false, enum: DocumentType, description: 'Filter by document type' })
  @ApiQuery({ name: 'status', required: false, enum: DocumentStatus, description: 'Filter by document status' })
  @ApiQuery({ name: 'transactionId', required: false, description: 'Filter by transaction ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  findAll(
    @Query('type') type?: DocumentType,
    @Query('status') status?: DocumentStatus,
    @Query('transactionId') transactionId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?,
  ) {
    return this.documentsService.findAll({
      userId: req?.user?.sub || req?.user?.userId,
      type,
      status,
      transactionId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get document statistics', description: 'Returns aggregated statistics about documents' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStats(@Request() req?) {
    return this.documentsService.getStats(req?.user?.sub || req?.user?.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID', description: 'Returns detailed information about a specific document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document', description: 'Updates document metadata. Only owner or admin can update.' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not the owner' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @Request() req,
  ) {
    return this.documentsService.update(id, updateDocumentDto, req.user?.sub || req.user?.userId);
  }

  @Post(':id/verify')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Verify document', description: 'Admin only. Marks a document as verified.' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document verified successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  verify(@Param('id') id: string, @Body() body: { notes?: string }, @Request() req) {
    return this.documentsService.verify(id, req.user?.sub || req.user?.userId, body.notes);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reject document', description: 'Admin only. Marks a document as rejected with notes.' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document rejected successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  reject(@Param('id') id: string, @Body() body: { notes: string }, @Request() req) {
    return this.documentsService.reject(id, req.user?.sub || req.user?.userId, body.notes);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete document', description: 'Deletes a document. Only owner or admin can delete.' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not the owner' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  remove(@Param('id') id: string, @Request() req) {
    return this.documentsService.remove(id, req.user?.sub || req.user?.userId);
  }
}

