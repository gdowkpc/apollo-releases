import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile

P=Path(__file__).resolve().parents[1]/'scripts/compare_pi_installer_maintenance.py'
SPEC=importlib.util.spec_from_file_location('maintenance_compare',P)
c=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(c)
OLD="""import os,sys
CURRENT='/protected'
def activate(): return CURRENT
def main():
 print('old completion')
 return activate()
if __name__=='__main__':
 try: main()
 except RuntimeError as error:
  code=str(error)
  print(code)
"""
NEW=OLD.replace("print('old completion')","print('new completion')")
NEW="SUPPORT_PHASES=frozenset(['phase'])\nSUPPORT_CODES=frozenset(['code'])\n"+NEW
NEW+="\ndef support_summary(code): return {}\ndef support_report_html(summary): return ''\ndef write_support_report(code): return None\n"

class MaintenanceComparisonTests(unittest.TestCase):
 def compare(self,new=NEW,payload=b'unchanged',extra=False):
  with tempfile.TemporaryDirectory() as d:
   files=[]
   for label,source,data in [('old',OLD,b'unchanged'),('new',new,payload)]:
    file=Path(d)/(label+'.zip');files.append(file)
    with zipfile.ZipFile(file,'w') as z:
     z.writestr('Apollo-Pi-Installer/install.py',source)
     z.writestr('Apollo-Pi-Installer/READ-ME-FIRST.md',label)
     z.writestr('Apollo-Pi-Installer/READ-ME-FIRST.html',label)
     z.writestr('Apollo-Pi-Installer/candidate.json',label)
     for n in ['a','b','c']:z.writestr('Apollo-Pi-Installer/payload/'+n,data)
     if extra and label=='new':z.writestr('Apollo-Pi-Installer/unreviewed.py','unsafe')
   return c.compare(*files)
 def test_static_completion_and_reviewed_helpers_pass(self):
  self.assertTrue(self.compare()['activation_logic_unchanged'])
 def test_activation_change_rejected(self):
  with self.assertRaisesRegex(RuntimeError,'activation_changed'):self.compare(NEW.replace('return CURRENT',"return '/different'"))
 def test_changed_global_rejected(self):
  with self.assertRaisesRegex(RuntimeError,'global_or_dispatch_changed'):self.compare(NEW.replace("CURRENT='/protected'","CURRENT='/different'"))
 def test_print_side_effect_is_not_discarded(self):
  with self.assertRaisesRegex(RuntimeError,'activation_changed'):self.compare(NEW.replace("print('new completion')","print(activate())"))
 def test_unknown_new_helper_rejected(self):
  with self.assertRaisesRegex(RuntimeError,'functions_changed'):self.compare(NEW+'\ndef bypass(): return True\n')
 def test_payload_change_rejected(self):
  with self.assertRaisesRegex(RuntimeError,'payload_changed'):self.compare(payload=b'changed')
 def test_added_member_rejected(self):
  with self.assertRaisesRegex(RuntimeError,'members_changed'):self.compare(extra=True)
 def test_report_hook_is_only_admitted_in_error_handler(self):
  hook="\n  if (sys.platform.startswith('linux') and hasattr(os,'geteuid') and os.geteuid()==0 and any(mode in sys.argv[1:] for mode in ('--apply','--repair-gateway'))):\n   write_support_report(code)\n"
  self.assertTrue(self.compare(NEW.replace('  print(code)','  print(code)'+hook))['activation_logic_unchanged'])
  success="\nif (sys.platform.startswith('linux') and hasattr(os,'geteuid') and os.geteuid()==0 and any(mode in sys.argv[1:] for mode in ('--apply','--repair-gateway'))):\n write_support_report(code)\n"
  with self.assertRaisesRegex(RuntimeError,'global_or_dispatch_changed'):self.compare(NEW+success)

 def test_exact_newer_error_help_is_allowed(self):
  old=globals()['OLD'];new=globals()['NEW']
  try:
   globals()['OLD']=old.replace('def main():','def failure_help(code): return "generic"\ndef main():')
   reviewed='if code == "pi_installer_not_newer":\n  return '+repr(c.NEWER_HELP.body[0].value.value)+'\n '
   globals()['NEW']=new.replace('def main():','def failure_help(code):\n '+reviewed+'return "generic"\ndef main():')
   self.assertTrue(self.compare(globals()['NEW'])['activation_logic_unchanged'])
   with self.assertRaisesRegex(RuntimeError,'activation_changed'):
    self.compare(globals()['NEW'].replace('Keep it;','Bypass it;'))
  finally:globals()['OLD']=old;globals()['NEW']=new
 def test_exact_error_retry_guidance_is_allowed_but_operations_are_rejected(self):
  old=globals()['OLD'];new=globals()['NEW']
  try:
   import ast
   prior=ast.unparse(c.OLD_RETRY);reviewed=ast.unparse(c.NEWER_RETRY)
   globals()['OLD']=old.replace('  print(code)','  '+prior)
   candidate=new.replace('  print(code)','\n'.join('  '+line for line in reviewed.splitlines()))
   self.assertTrue(self.compare(candidate)['activation_logic_unchanged'])
   with self.assertRaisesRegex(RuntimeError,'global_or_dispatch_changed'):
    self.compare(candidate.replace('No downgrade was performed.','Downgrade accepted.'))
   with self.assertRaisesRegex(RuntimeError,'global_or_dispatch_changed'):
    self.compare(candidate.replace('  else:\n','  else:\n      activate()\n'))
  finally:globals()['OLD']=old;globals()['NEW']=new

if __name__=='__main__':unittest.main()
